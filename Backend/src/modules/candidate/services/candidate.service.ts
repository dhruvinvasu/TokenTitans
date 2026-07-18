import { inject, injectable } from 'inversify'
import { HydratedDocument } from 'mongoose'
import { Config } from '@/config/app.config'
import ConflictError from '@/errors/conflict.error'
import NotFoundError from '@/errors/not-found.error'
import {
  CandidateStatus,
  RejectionStage,
} from '@/modules/candidate/constants/candidate.constants'
import { ICandidate } from '@/modules/candidate/models/candidate.model'
import {
  CandidateListQueryDTO,
  ApplyCandidateDTO,
  ScheduleInterviewDTO,
  SendOfferDTO,
} from '@/modules/candidate/dtos/candidate.dto'
import { CandidateRepository } from '@/modules/candidate/repositories/candidate.repository'
import { AptitudeService } from '@/modules/aptitude/services/aptitude.service'
import { JobService } from '@/modules/job/services/job.service'
import { MatchingService } from '@/modules/matching/services/matching.service'
import { NotificationType } from '@/modules/notification/models/notification.model'
import { NotificationService } from '@/modules/notification/services/notification.service'
import { StoredUpload, ResumeService } from '@/modules/resume/services/resume.service'
import { EmailLogRepository } from '@/modules/email/repositories/email-log.repository'
import { MailService } from '@/modules/email/services/mail.service'
import { AuditService } from '@/modules/audit/services/audit.service'
import { TimelineActor } from '@/modules/timeline/models/candidate-timeline.model'
import { TimelineService } from '@/modules/timeline/services/timeline.service'
import { TYPES } from '@/types/di.types'

type CandidateDoc = HydratedDocument<ICandidate>

@injectable()
export class CandidateService {
  constructor(
    @inject(TYPES.CandidateRepository)
    private readonly candidateRepository: CandidateRepository,
    @inject(TYPES.JobService)
    private readonly jobService: JobService,
    @inject(TYPES.ResumeService)
    private readonly resumeService: ResumeService,
    @inject(TYPES.MatchingService)
    private readonly matchingService: MatchingService,
    @inject(TYPES.AptitudeService)
    private readonly aptitudeService: AptitudeService,
    @inject(TYPES.TimelineService)
    private readonly timelineService: TimelineService,
    @inject(TYPES.NotificationService)
    private readonly notificationService: NotificationService,
    @inject(TYPES.AuditService)
    private readonly auditService: AuditService,
    @inject(TYPES.MailService)
    private readonly mailService: MailService,
    @inject(TYPES.EmailLogRepository)
    private readonly emailLogRepository: EmailLogRepository,
  ) {}

  /**
   * Full candidate intake pipeline executed on application:
   * apply -> resume parse -> skill match -> salary match -> test invitation.
   * Returns an immediate, candidate-facing result (rejected or passed).
   */
  async apply(data: ApplyCandidateDTO, upload: StoredUpload) {
    const job = await this.jobService.getById(data.jobId)
    if (!job.isActive) {
      throw new ConflictError({
        error: 'JOB_INACTIVE',
        message: 'This position is no longer accepting applications.',
      })
    }

    const existing = await this.candidateRepository.findOne({
      email: data.email,
      job: job._id,
      deletedAt: null,
    })
    if (existing) {
      throw new ConflictError({
        error: 'ALREADY_APPLIED',
        message: 'You have already applied for this position.',
      })
    }

    const candidateDoc = await this.candidateRepository.create({
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      currentCtc: data.currentCtc,
      expectedCtc: data.expectedCtc,
      job: job._id as unknown as never,
      status: CandidateStatus.APPLIED,
      riskScore: 0,
      notes: [],
    })
    const candidate = candidateDoc as CandidateDoc

    await this.timelineService.record({
      candidateId: candidate._id.toString(),
      event: CandidateStatus.APPLIED,
      message: `Applied for ${job.title}`,
      toStatus: CandidateStatus.APPLIED,
      actorType: TimelineActor.CANDIDATE,
    })
    await this.notificationService.notify({
      type: NotificationType.CANDIDATE_APPLIED,
      title: 'New application received',
      message: `${data.fullName} applied for ${job.title}.`,
      candidateId: candidate._id.toString(),
    })

    // Resume upload + parsing.
    await this.advance(candidate, CandidateStatus.RESUME_UPLOADED, 'Resume uploaded')
    const resume = await this.resumeService.processUpload(
      candidate._id.toString(),
      upload,
    )
    candidate.resume = resume._id
    candidate.profile = {
      skills: resume.analysis?.skills ?? [],
      experienceYears: resume.analysis?.experienceYears ?? 0,
      location: data.location,
      previousCompanies: resume.analysis?.previousCompanies ?? [],
    }
    await this.advance(candidate, CandidateStatus.RESUME_PARSED, 'Resume parsed')

    const candidateSkills = resume.analysis?.skills ?? []

    // Skill matching.
    await this.advance(candidate, CandidateStatus.SKILL_MATCHING, 'Skill matching started')
    const skillMatch = await this.matchingService.matchSkills({
      requiredSkills: job.requiredSkills,
      candidateSkills,
      threshold: job.skillMatchThreshold,
      jobTitle: job.title,
    })
    candidate.skillMatch = skillMatch

    if (!skillMatch.passed) {
      const reason = await this.matchingService.generateRejectionReason('skill', {
        jobTitle: job.title,
        percentage: skillMatch.percentage,
        missingSkills: skillMatch.missingSkills,
      })
      await this.reject(
        candidate,
        CandidateStatus.SKILL_REJECTED,
        RejectionStage.SKILL_MATCH,
        reason,
      )
      await this.notificationService.notify({
        type: NotificationType.SKILL_REJECTED,
        title: 'Candidate rejected on skills',
        message: `${data.fullName} scored ${skillMatch.percentage}% skill match.`,
        candidateId: candidate._id.toString(),
      })
      return this.buildResult(candidate, 'REJECTED', RejectionStage.SKILL_MATCH, reason)
    }
    await this.advance(candidate, CandidateStatus.SKILL_PASSED, 'Skill matching passed')

    // Salary matching.
    await this.advance(candidate, CandidateStatus.SALARY_MATCHING, 'Salary matching started')
    const salaryMatch = await this.matchingService.matchSalary({
      salaryRange: job.salaryRange,
      currentCtc: data.currentCtc,
      expectedCtc: data.expectedCtc,
      threshold: job.salaryMatchThreshold,
    })
    candidate.salaryMatch = salaryMatch

    if (!salaryMatch.passed) {
      const reason = await this.matchingService.generateRejectionReason('salary', {
        expectedCtc: data.expectedCtc,
        salaryRange: job.salaryRange,
        percentage: salaryMatch.percentage,
      })
      await this.reject(
        candidate,
        CandidateStatus.SALARY_REJECTED,
        RejectionStage.SALARY_MATCH,
        reason,
      )
      await this.notificationService.notify({
        type: NotificationType.SALARY_REJECTED,
        title: 'Candidate rejected on salary',
        message: `${data.fullName} scored ${salaryMatch.percentage}% salary match.`,
        candidateId: candidate._id.toString(),
      })
      return this.buildResult(candidate, 'REJECTED', RejectionStage.SALARY_MATCH, reason)
    }
    await this.advance(candidate, CandidateStatus.SALARY_PASSED, 'Salary matching passed')

    // Aptitude test invitation.
    await this.aptitudeService.createAndInvite(
      candidate._id.toString(),
      job,
      candidateSkills,
    )
    await this.advance(candidate, CandidateStatus.EMAIL_SENT, 'Aptitude test invitation sent')
    await this.advance(candidate, CandidateStatus.TEST_PENDING, 'Awaiting aptitude test')

    return this.buildResult(candidate, 'PASSED')
  }

  async list(query: CandidateListQueryDTO) {
    const filter: Record<string, unknown> = {}
    if (query.status) filter.status = query.status
    if (query.jobId) filter.job = query.jobId
    if (query.search) {
      filter.$or = [
        { fullName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ]
    }

    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const { items, total } = await this.candidateRepository.search(filter, {
      page,
      limit,
    })

    return {
      candidates: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  }

  async getDetails(candidateId: string) {
    const candidate = await this.candidateRepository.findByIdWithRelations(candidateId)
    if (!candidate) {
      throw new NotFoundError({
        error: 'CANDIDATE_NOT_FOUND',
        message: 'Candidate not found.',
      })
    }

    const [timeline, emails] = await Promise.all([
      this.timelineService.listForCandidate(candidateId),
      this.emailLogRepository.findByCandidate(candidateId),
    ])

    return { candidate, timeline, emails }
  }

  async addNote(candidateId: string, authorId: string, text: string) {
    const candidate = await this.getDoc(candidateId)
    candidate.notes.push({
      author: authorId as unknown as never,
      text,
      createdAt: new Date(),
    })
    await candidate.save()
    await this.auditService.record({
      action: 'CANDIDATE_NOTE_ADDED',
      entity: 'Candidate',
      entityId: candidateId,
      actor: authorId,
    })
    return candidate
  }

  async assignRecruiter(candidateId: string, recruiterId: string, actorId: string) {
    const candidate = await this.getDoc(candidateId)
    candidate.assignedRecruiter = recruiterId as unknown as never
    await candidate.save()
    await this.timelineService.record({
      candidateId,
      event: 'RECRUITER_ASSIGNED',
      message: 'Recruiter assigned',
      actorType: TimelineActor.HR,
      actor: actorId,
    })
    return candidate
  }

  async scheduleInterview(
    candidateId: string,
    data: ScheduleInterviewDTO,
    actorId: string,
  ) {
    const candidate = await this.getDoc(candidateId)
    const isReschedule = Boolean(candidate.interview?.scheduledAt)
    candidate.interview = {
      scheduledAt: new Date(data.scheduledAt),
      mode: data.mode,
      location: data.location,
      feedback: candidate.interview?.feedback,
      rescheduledCount:
        (candidate.interview?.rescheduledCount ?? 0) + (isReschedule ? 1 : 0),
    }
    await this.advance(
      candidate,
      CandidateStatus.INTERVIEW_SCHEDULED,
      isReschedule ? 'Interview rescheduled' : 'Interview scheduled',
      { scheduledAt: data.scheduledAt, mode: data.mode },
      TimelineActor.HR,
      actorId,
    )
    return candidate
  }

  async addInterviewFeedback(candidateId: string, feedback: string, actorId: string) {
    const candidate = await this.getDoc(candidateId)
    candidate.interview = {
      scheduledAt: candidate.interview?.scheduledAt,
      mode: candidate.interview?.mode,
      location: candidate.interview?.location,
      feedback,
      rescheduledCount: candidate.interview?.rescheduledCount ?? 0,
    }
    await candidate.save()
    await this.timelineService.record({
      candidateId,
      event: 'INTERVIEW_FEEDBACK',
      message: 'Interview feedback recorded',
      actorType: TimelineActor.HR,
      actor: actorId,
    })
    return candidate
  }

  async sendOffer(candidateId: string, data: SendOfferDTO, actorId: string) {
    const candidate = await this.getDoc(candidateId)
    candidate.offer = {
      sentAt: new Date(),
      ctc: data.ctc,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
    }
    await this.advance(
      candidate,
      CandidateStatus.OFFER_SENT,
      'Offer sent',
      { ctc: data.ctc },
      TimelineActor.HR,
      actorId,
    )

    await this.mailService.send({
      candidateId,
      to: candidate.email,
      subject: 'Job Offer',
      template: 'offer',
      html:
        `<p>Dear ${candidate.fullName},</p><p>We are pleased to offer you the ` +
        `position with a CTC of ${data.ctc}. Please respond to confirm.</p>`,
    })
    return candidate
  }

  async markJoined(candidateId: string, actorId: string) {
    const candidate = await this.getDoc(candidateId)
    await this.advance(
      candidate,
      CandidateStatus.JOINED,
      'Candidate joined',
      {},
      TimelineActor.HR,
      actorId,
    )
    return candidate
  }

  async rejectByHr(candidateId: string, reason: string, actorId: string) {
    const candidate = await this.getDoc(candidateId)
    candidate.rejectionReason = reason
    candidate.rejectionStage = RejectionStage.HR_DECISION
    candidate.rejectedAt = new Date()
    await this.advance(
      candidate,
      CandidateStatus.REJECTED,
      'Rejected by HR',
      { reason },
      TimelineActor.HR,
      actorId,
    )
    return candidate
  }

  async archive(candidateId: string, actorId: string) {
    const candidate = await this.getDoc(candidateId)
    candidate.archivedAt = new Date()
    await this.advance(
      candidate,
      CandidateStatus.ARCHIVED,
      'Candidate archived',
      {},
      TimelineActor.HR,
      actorId,
    )
    return candidate
  }

  async remove(candidateId: string, actorId: string) {
    const candidate = await this.getDoc(candidateId)
    candidate.deletedAt = new Date()
    await candidate.save()
    await this.auditService.record({
      action: 'CANDIDATE_DELETED',
      entity: 'Candidate',
      entityId: candidateId,
      actor: actorId,
    })
  }

  async exportCandidate(candidateId: string) {
    const { candidate, timeline, emails } = await this.getDetails(candidateId)
    return { candidate, timeline, emails, exportedAt: new Date() }
  }

  private async getDoc(candidateId: string): Promise<CandidateDoc> {
    const candidate = await this.candidateRepository.findDocumentById(candidateId)
    if (!candidate) {
      throw new NotFoundError({
        error: 'CANDIDATE_NOT_FOUND',
        message: 'Candidate not found.',
      })
    }
    return candidate as CandidateDoc
  }

  private async advance(
    candidate: CandidateDoc,
    status: CandidateStatus,
    message: string,
    meta?: Record<string, unknown>,
    actorType: TimelineActor = TimelineActor.SYSTEM,
    actor?: string,
  ) {
    const fromStatus = candidate.status
    candidate.status = status
    await candidate.save()
    await this.timelineService.record({
      candidateId: candidate._id.toString(),
      event: status,
      message,
      fromStatus,
      toStatus: status,
      actorType,
      actor,
      meta,
    })
  }

  private async reject(
    candidate: CandidateDoc,
    status: CandidateStatus,
    stage: RejectionStage,
    reason: string,
  ) {
    candidate.rejectionReason = reason
    candidate.rejectionStage = stage
    candidate.rejectedAt = new Date()
    await this.advance(candidate, status, `Rejected at ${stage}`, { reason })
  }

  private buildResult(
    candidate: CandidateDoc,
    outcome: 'PASSED' | 'REJECTED',
    stage?: RejectionStage,
    reason?: string,
  ) {
    return {
      candidateId: candidate._id.toString(),
      outcome,
      status: candidate.status,
      rejectionStage: stage,
      rejectionReason: reason,
      skillMatch: candidate.skillMatch,
      salaryMatch: candidate.salaryMatch,
      message:
        outcome === 'PASSED'
          ? 'Congratulations! You have passed the initial screening. An aptitude ' +
            `test invitation has been sent to your email (valid for ` +
            `${Config.APTITUDE_LINK_VALID_DAYS} days).`
          : reason,
    }
  }
}
