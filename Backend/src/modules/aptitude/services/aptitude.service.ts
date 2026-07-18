import { inject, injectable } from 'inversify'
import { HydratedDocument } from 'mongoose'
import { nanoid } from 'nanoid'
import { Config } from '@/config/app.config'
import ConflictError from '@/errors/conflict.error'
import NotFoundError from '@/errors/not-found.error'
import ValidationError from '@/errors/validation.error'
import {
  AptitudeTestStatus,
  TestRecommendation,
  VIOLATION_WEIGHTS,
  ViolationType,
} from '@/modules/aptitude/constants/aptitude.constants'
import { FALLBACK_QUESTION_BANK } from '@/modules/aptitude/constants/question-bank.constants'
import {
  IAptitudeQuestion,
  IAptitudeTest,
} from '@/modules/aptitude/models/aptitude-test.model'
import { TestEventCategory } from '@/modules/aptitude/models/test-event.model'
import { AptitudeRepository } from '@/modules/aptitude/repositories/aptitude.repository'
import {
  RawTestEvent,
  TestEventRepository,
} from '@/modules/aptitude/repositories/test-event.repository'
import { ClaudeCliService } from '@/modules/ai/services/claude-cli.service'
import { CandidateStatus } from '@/modules/candidate/constants/candidate.constants'
import { CandidateRepository } from '@/modules/candidate/repositories/candidate.repository'
import { MailService } from '@/modules/email/services/mail.service'
import { IJob } from '@/modules/job/models/job.model'
import { NotificationType } from '@/modules/notification/models/notification.model'
import { NotificationService } from '@/modules/notification/services/notification.service'
import { TimelineActor } from '@/modules/timeline/models/candidate-timeline.model'
import { TimelineService } from '@/modules/timeline/services/timeline.service'
import { TYPES } from '@/types/di.types'
import { logger } from '@/utils/logger.util'

export interface IncomingTestEvent {
  category: TestEventCategory
  type: string
  occurredAt?: string | Date
  meta?: Record<string, unknown>
}

export interface SubmitAnswer {
  questionIndex: number
  selectedIndex: number
}

@injectable()
export class AptitudeService {
  constructor(
    @inject(TYPES.AptitudeRepository)
    private readonly aptitudeRepository: AptitudeRepository,
    @inject(TYPES.TestEventRepository)
    private readonly testEventRepository: TestEventRepository,
    @inject(TYPES.ClaudeCliService)
    private readonly claudeCliService: ClaudeCliService,
    @inject(TYPES.MailService)
    private readonly mailService: MailService,
    @inject(TYPES.CandidateRepository)
    private readonly candidateRepository: CandidateRepository,
    @inject(TYPES.TimelineService)
    private readonly timelineService: TimelineService,
    @inject(TYPES.NotificationService)
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Generates a role-specific test, persists it with a secure token and emails
   * the candidate the invitation. Called by the candidate pipeline once both
   * skill and salary matching have passed.
   */
  async createAndInvite(candidateId: string, job: IJob, candidateSkills: string[]) {
    const questions = await this.generateQuestions(job, candidateSkills)
    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + Config.APTITUDE_LINK_VALID_DAYS * 24 * 60 * 60 * 1000,
    )
    const token = nanoid(32)

    const test = await this.aptitudeRepository.create({
      candidate: candidateId as unknown as never,
      job: job._id as unknown as never,
      token,
      status: AptitudeTestStatus.PENDING,
      durationMinutes: Config.APTITUDE_DURATION_MINUTES,
      totalQuestions: questions.length,
      maxViolations: Config.APTITUDE_MAX_VIOLATIONS,
      questions,
      answers: [],
      sentAt: now,
      expiresAt,
      score: 0,
      percentage: 0,
      correctCount: 0,
      wrongCount: 0,
      timeTakenSeconds: 0,
      violationCount: 0,
      riskScore: 0,
      resumeAllowed: true,
      resumeCount: 0,
    })

    const candidate = await this.candidateRepository.findDocumentById(candidateId)
    if (candidate) {
      await this.mailService.send({
        candidateId,
        to: candidate.email,
        subject: `Aptitude Test Invitation — ${job.title}`,
        template: 'aptitude-invitation',
        html: this.buildInvitationEmail(candidate.fullName, job.title, token, expiresAt),
        expiresAt,
        meta: { testId: test._id.toString() },
      })
    }

    return test
  }

  /** Candidate-facing: fetch the test for the runner (answers hidden). */
  async getForCandidate(token: string) {
    const test = await this.aptitudeRepository.findByToken(token)
    if (!test) {
      throw new NotFoundError({
        error: 'TEST_NOT_FOUND',
        message: 'Invalid or expired test link.',
      })
    }

    const expired = this.ensureNotExpired(test)
    if (expired) await this.markExpired(test)

    return this.toCandidateView(test)
  }

  async startTest(token: string) {
    const test = await this.aptitudeRepository.findByToken(token)
    if (!test) {
      throw new NotFoundError({
        error: 'TEST_NOT_FOUND',
        message: 'Invalid or expired test link.',
      })
    }

    if (
      [
        AptitudeTestStatus.SUBMITTED,
        AptitudeTestStatus.FAILED,
        AptitudeTestStatus.EXPIRED,
      ].includes(test.status)
    ) {
      throw new ConflictError({
        error: 'TEST_ALREADY_CLOSED',
        message: 'This test has already been completed or is no longer available.',
      })
    }

    if (this.ensureNotExpired(test)) {
      await this.markExpired(test)
      throw new ConflictError({
        error: 'TEST_EXPIRED',
        message: 'This test link has expired. Please contact HR.',
      })
    }

    const now = new Date()

    if (test.status === AptitudeTestStatus.STARTED) {
      // Controlled resume after an accidental disconnect / browser close.
      if (!test.resumeAllowed) {
        throw new ConflictError({
          error: 'RESUME_NOT_ALLOWED',
          message: 'Resuming this test is not permitted. Please contact HR.',
        })
      }
      test.resumeCount += 1
      await test.save()
      return this.toCandidateView(test)
    }

    test.status = AptitudeTestStatus.STARTED
    test.startedAt = now
    test.deadlineAt = new Date(now.getTime() + test.durationMinutes * 60 * 1000)
    await test.save()

    await this.updateCandidateStatus(
      test.candidate.toString(),
      CandidateStatus.TEST_STARTED,
      'Aptitude test started',
    )

    return this.toCandidateView(test)
  }

  /** Batched telemetry + violation ingestion. Auto-fails on limit breach. */
  async recordEvents(token: string, events: IncomingTestEvent[]) {
    const test = await this.aptitudeRepository.findByToken(token)
    if (!test) {
      throw new NotFoundError({
        error: 'TEST_NOT_FOUND',
        message: 'Invalid test link.',
      })
    }

    if (test.status !== AptitudeTestStatus.STARTED) {
      return this.securitySnapshot(test, false)
    }

    const rawEvents: RawTestEvent[] = events.map((event) => {
      const isViolation = event.category === TestEventCategory.VIOLATION
      const weight = isViolation
        ? VIOLATION_WEIGHTS[event.type as ViolationType] ?? 3
        : 0
      return {
        test: test._id.toString(),
        candidate: test.candidate.toString(),
        category: event.category,
        type: event.type,
        weight,
        occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
        meta: event.meta,
      }
    })

    await this.testEventRepository.insertBatch(rawEvents)

    const violationEvents = rawEvents.filter(
      (event) => event.category === TestEventCategory.VIOLATION,
    )
    const addedWeight = violationEvents.reduce(
      (sum, event) => sum + event.weight,
      0,
    )

    test.violationCount += violationEvents.length
    test.riskScore = Math.min(100, test.riskScore + addedWeight)

    let failed = false
    if (test.violationCount >= test.maxViolations) {
      failed = true
      test.status = AptitudeTestStatus.FAILED
      test.submittedAt = new Date()
      test.recommendation = TestRecommendation.DISQUALIFIED
      await this.updateCandidateStatus(
        test.candidate.toString(),
        CandidateStatus.TEST_FAILED,
        'Auto-failed: security violation limit exceeded',
        { violationCount: test.violationCount },
      )
      await this.notificationService.notify({
        type: NotificationType.SECURITY_VIOLATION,
        title: 'Candidate auto-failed on violations',
        message: `A candidate exceeded the violation limit (${test.violationCount}).`,
        candidateId: test.candidate.toString(),
      })
    }

    await test.save()
    return this.securitySnapshot(test, failed)
  }

  async submitTest(token: string, answers: SubmitAnswer[], autoSubmitted = false) {
    const test = await this.aptitudeRepository.findByTokenWithAnswers(token)
    if (!test) {
      throw new NotFoundError({
        error: 'TEST_NOT_FOUND',
        message: 'Invalid test link.',
      })
    }

    if (
      [
        AptitudeTestStatus.SUBMITTED,
        AptitudeTestStatus.FAILED,
        AptitudeTestStatus.EXPIRED,
      ].includes(test.status)
    ) {
      throw new ConflictError({
        error: 'TEST_ALREADY_CLOSED',
        message: 'This test has already been submitted.',
      })
    }

    if (test.status !== AptitudeTestStatus.STARTED) {
      throw new ValidationError([
        { field: 'test', message: 'Test has not been started.' },
      ])
    }

    const now = new Date()
    let correctCount = 0
    const persistedAnswers = answers.map((answer) => {
      const question = test.questions[answer.questionIndex]
      if (question && question.correctIndex === answer.selectedIndex) {
        correctCount += 1
      }
      return { ...answer, answeredAt: now }
    })

    const totalQuestions = test.totalQuestions || test.questions.length
    const wrongCount = totalQuestions - correctCount
    const percentage =
      totalQuestions === 0
        ? 0
        : Math.round((correctCount / totalQuestions) * 100)

    const startedAt = test.startedAt ?? now
    const rawSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000)
    const timeTakenSeconds = Math.min(
      rawSeconds,
      test.durationMinutes * 60,
    )

    test.answers = persistedAnswers
    test.correctCount = correctCount
    test.wrongCount = wrongCount
    test.score = correctCount
    test.percentage = percentage
    test.timeTakenSeconds = timeTakenSeconds
    test.status = AptitudeTestStatus.SUBMITTED
    test.submittedAt = now
    test.recommendation = this.deriveRecommendation(
      percentage,
      test.riskScore,
      test.violationCount,
    )

    await test.save()

    await this.updateCandidateStatus(
      test.candidate.toString(),
      CandidateStatus.TEST_COMPLETED,
      autoSubmitted ? 'Aptitude test auto-submitted' : 'Aptitude test submitted',
      { percentage, riskScore: test.riskScore },
    )

    await this.notificationService.notify({
      type: NotificationType.TEST_COMPLETED,
      title: 'Aptitude test completed',
      message: `A candidate completed the aptitude test with ${percentage}%.`,
      candidateId: test.candidate.toString(),
    })

    return {
      score: correctCount,
      percentage,
      correctCount,
      wrongCount,
      timeTakenSeconds,
      violationCount: test.violationCount,
      riskScore: test.riskScore,
      recommendation: test.recommendation,
    }
  }

  /** HR: full report including questions, answers and violation events. */
  async getReport(candidateId: string) {
    const test = await this.aptitudeRepository.findByCandidate(candidateId)
    if (!test) {
      throw new NotFoundError({
        error: 'TEST_NOT_FOUND',
        message: 'No aptitude test found for this candidate.',
      })
    }
    const events = await this.testEventRepository.findByTest(test._id.toString())
    const violations = events.filter(
      (event) => event.category === TestEventCategory.VIOLATION,
    )
    return { test: test.toObject(), events, violations }
  }

  /** HR action: reset the test so the candidate can re-attempt. */
  async resetTest(candidateId: string) {
    const test = await this.aptitudeRepository.findByCandidate(candidateId)
    if (!test) {
      throw new NotFoundError({
        error: 'TEST_NOT_FOUND',
        message: 'No aptitude test found for this candidate.',
      })
    }

    const now = new Date()
    test.status = AptitudeTestStatus.PENDING
    test.answers = []
    test.score = 0
    test.percentage = 0
    test.correctCount = 0
    test.wrongCount = 0
    test.timeTakenSeconds = 0
    test.violationCount = 0
    test.riskScore = 0
    test.recommendation = undefined
    test.startedAt = undefined
    test.deadlineAt = undefined
    test.submittedAt = undefined
    test.resumeCount = 0
    test.expiresAt = new Date(
      now.getTime() + Config.APTITUDE_LINK_VALID_DAYS * 24 * 60 * 60 * 1000,
    )
    await test.save()

    await this.updateCandidateStatus(
      candidateId,
      CandidateStatus.TEST_PENDING,
      'Aptitude test reset by HR',
      {},
      TimelineActor.HR,
    )

    return test
  }

  /** HR action: extend the validity window of a pending test link. */
  async extendTest(candidateId: string, days: number) {
    const test = await this.aptitudeRepository.findByCandidate(candidateId)
    if (!test) {
      throw new NotFoundError({
        error: 'TEST_NOT_FOUND',
        message: 'No aptitude test found for this candidate.',
      })
    }

    test.expiresAt = new Date(
      test.expiresAt.getTime() + days * 24 * 60 * 60 * 1000,
    )
    if (test.status === AptitudeTestStatus.EXPIRED) {
      test.status = AptitudeTestStatus.PENDING
    }
    await test.save()

    await this.updateCandidateStatus(
      candidateId,
      CandidateStatus.TEST_PENDING,
      `Aptitude test extended by ${days} day(s)`,
      { newExpiry: test.expiresAt },
      TimelineActor.HR,
    )

    return test
  }

  private async generateQuestions(
    job: IJob,
    candidateSkills: string[],
  ): Promise<IAptitudeQuestion[]> {
    const count = Config.APTITUDE_QUESTION_COUNT

    if (this.claudeCliService.isEnabled) {
      try {
        const systemPrompt =
          `You are an expert technical interviewer. Generate exactly ${count} ` +
          'multiple-choice aptitude questions tailored to the given job role and ' +
          'skills. Each question must have exactly 4 options and one correct ' +
          'answer. Respond ONLY with JSON: { "questions": [{ "question": string, ' +
          '"options": string[4], "correctIndex": number (0-3), "skillTag": string }] }.'
        const userPrompt = JSON.stringify({
          role: job.role,
          title: job.title,
          requiredSkills: job.requiredSkills,
          candidateSkills,
        })
        const result = await this.claudeCliService.completeJson<{
          questions: IAptitudeQuestion[]
        }>(systemPrompt, userPrompt)

        const valid = (result.questions ?? []).filter(this.isValidQuestion)
        if (valid.length >= count) return valid.slice(0, count)
        if (valid.length > 0) {
          return this.padWithFallback(valid, count)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.error(
          `AI question generation failed, using fallback bank: ${message}`,
        )
      }
    }

    return this.padWithFallback([], count)
  }

  private padWithFallback(
    questions: IAptitudeQuestion[],
    count: number,
  ): IAptitudeQuestion[] {
    const result = [...questions]
    const bank = [...FALLBACK_QUESTION_BANK]
    let index = 0
    while (result.length < count && index < bank.length) {
      result.push(bank[index])
      index += 1
    }
    return result.slice(0, count)
  }

  private isValidQuestion(question: IAptitudeQuestion): boolean {
    return (
      typeof question.question === 'string' &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      typeof question.correctIndex === 'number' &&
      question.correctIndex >= 0 &&
      question.correctIndex <= 3
    )
  }

  private deriveRecommendation(
    percentage: number,
    riskScore: number,
    violationCount: number,
  ): TestRecommendation {
    if (violationCount >= Config.APTITUDE_MAX_VIOLATIONS) {
      return TestRecommendation.DISQUALIFIED
    }
    if (percentage >= 80 && riskScore < 20) return TestRecommendation.STRONG_PASS
    if (percentage >= 60 && riskScore < 40) return TestRecommendation.PASS
    if (percentage >= 40) return TestRecommendation.BORDERLINE
    return TestRecommendation.FAIL
  }

  private ensureNotExpired(test: IAptitudeTest): boolean {
    return (
      test.status === AptitudeTestStatus.PENDING &&
      test.expiresAt.getTime() < Date.now()
    )
  }

  private async markExpired(test: HydratedDocument<IAptitudeTest>) {
    test.status = AptitudeTestStatus.EXPIRED
    await test.save()
  }

  private toCandidateView(test: IAptitudeTest) {
    const remainingSeconds = test.deadlineAt
      ? Math.max(
          0,
          Math.round((test.deadlineAt.getTime() - Date.now()) / 1000),
        )
      : test.durationMinutes * 60

    return {
      token: test.token,
      status: test.status,
      durationMinutes: test.durationMinutes,
      totalQuestions: test.totalQuestions,
      maxViolations: test.maxViolations,
      violationCount: test.violationCount,
      expiresAt: test.expiresAt,
      deadlineAt: test.deadlineAt,
      remainingSeconds,
      // Correct answers are hidden (select:false) so this view is safe.
      questions: test.questions.map((question, index) => ({
        index,
        question: question.question,
        options: question.options,
        skillTag: question.skillTag,
      })),
    }
  }

  private securitySnapshot(test: IAptitudeTest, failed: boolean) {
    return {
      violationCount: test.violationCount,
      maxViolations: test.maxViolations,
      riskScore: test.riskScore,
      remainingViolations: Math.max(
        0,
        test.maxViolations - test.violationCount,
      ),
      failed,
      status: test.status,
    }
  }

  private async updateCandidateStatus(
    candidateId: string,
    status: CandidateStatus,
    message: string,
    meta?: Record<string, unknown>,
    actorType: TimelineActor = TimelineActor.SYSTEM,
  ) {
    const candidate = await this.candidateRepository.findDocumentById(candidateId)
    if (!candidate) return
    const fromStatus = candidate.status
    candidate.status = status
    await candidate.save()

    await this.timelineService.record({
      candidateId,
      event: status,
      message,
      fromStatus,
      toStatus: status,
      actorType,
      meta,
    })
  }

  private buildInvitationEmail(
    fullName: string,
    jobTitle: string,
    token: string,
    expiresAt: Date,
  ): string {
    const link = `${Config.APP_BASE_URL}/aptitude/${token}`
    return `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Aptitude Test Invitation</h2>
        <p>Hello ${fullName},</p>
        <p>Congratulations! You have progressed to the aptitude test round for the
        <strong>${jobTitle}</strong> position.</p>
        <p>The test contains ${Config.APTITUDE_QUESTION_COUNT} questions and must be
        completed within ${Config.APTITUDE_DURATION_MINUTES} minutes once started.</p>
        <p>
          <a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 24px;
          border-radius:6px;text-decoration:none;display:inline-block;">
            Start Aptitude Test
          </a>
        </p>
        <p>This secure link is valid until
        <strong>${expiresAt.toUTCString()}</strong>.</p>
        <p style="color:#6b7280;font-size:13px;">Please ensure a stable internet
        connection and do not switch tabs or windows during the test. If you face any
        technical issue (internet, power or system failure), contact HR immediately.</p>
      </div>
    `
  }
}
