import { inject, injectable } from 'inversify'
import { AptitudeTestStatus } from '@/modules/aptitude/constants/aptitude.constants'
import { AptitudeRepository } from '@/modules/aptitude/repositories/aptitude.repository'
import {
  ACTIVE_STATUSES,
  CandidateStatus,
  REJECTED_STATUSES,
} from '@/modules/candidate/constants/candidate.constants'
import { CandidateRepository } from '@/modules/candidate/repositories/candidate.repository'
import { EmailStatus } from '@/modules/email/models/email-log.model'
import { EmailLogRepository } from '@/modules/email/repositories/email-log.repository'
import { TimelineRepository } from '@/modules/timeline/repositories/timeline.repository'
import { TYPES } from '@/types/di.types'

interface StatusCount {
  _id: string
  count: number
}

interface JobCount {
  _id: string
  title: string
  count: number
}

interface MatchStats {
  average: number
  passed: number
  failed: number
}

@injectable()
export class DashboardService {
  constructor(
    @inject(TYPES.CandidateRepository)
    private readonly candidateRepository: CandidateRepository,
    @inject(TYPES.EmailLogRepository)
    private readonly emailLogRepository: EmailLogRepository,
    @inject(TYPES.AptitudeRepository)
    private readonly aptitudeRepository: AptitudeRepository,
    @inject(TYPES.TimelineRepository)
    private readonly timelineRepository: TimelineRepository,
  ) {}

  async overview() {
    const [
      statusCounts,
      candidatesByJob,
      skillStats,
      salaryStats,
      testStats,
      recentApplications,
      recentActivities,
      emailStats,
    ] = await Promise.all([
      this.statusCounts(),
      this.candidatesByJob(),
      this.skillMatchStats(),
      this.salaryMatchStats(),
      this.testStatistics(),
      this.candidateRepository.runReadOnlyQuery({}, 5),
      this.timelineRepository.listRecent(10),
      this.emailStatistics(),
    ])

    const statusMap = new Map(statusCounts.map((item) => [item._id, item.count]))
    const totalCandidates = statusCounts.reduce(
      (sum, item) => sum + item.count,
      0,
    )
    const rejected = REJECTED_STATUSES.reduce(
      (sum, status) => sum + (statusMap.get(status) ?? 0),
      0,
    )
    const passed = ACTIVE_STATUSES.reduce(
      (sum, status) => sum + (statusMap.get(status) ?? 0),
      0,
    )

    return {
      totals: {
        totalCandidates,
        pending: statusMap.get(CandidateStatus.TEST_PENDING) ?? 0,
        underReview: statusMap.get(CandidateStatus.UNDER_HR_REVIEW) ?? 0,
        rejected,
        passed,
        interview: statusMap.get(CandidateStatus.INTERVIEW_SCHEDULED) ?? 0,
        offer: statusMap.get(CandidateStatus.OFFER_SENT) ?? 0,
        joined: statusMap.get(CandidateStatus.JOINED) ?? 0,
      },
      candidatesByStatus: Object.fromEntries(statusMap),
      candidatesByJob,
      skillMatchStats: skillStats,
      salaryMatchStats: salaryStats,
      testStatistics: testStats,
      emailStatistics: emailStats,
      recentApplications,
      recentActivities,
    }
  }

  private async statusCounts(): Promise<StatusCount[]> {
    return this.candidateRepository.aggregate<StatusCount>([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
  }

  private async candidatesByJob(): Promise<JobCount[]> {
    return this.candidateRepository.aggregate<JobCount>([
      { $match: { deletedAt: null } },
      { $group: { _id: '$job', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: '_id',
          as: 'job',
        },
      },
      { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          count: 1,
          title: { $ifNull: ['$job.title', 'Unknown'] },
        },
      },
      { $sort: { count: -1 } },
    ])
  }

  private async skillMatchStats(): Promise<MatchStats> {
    const [result] = await this.candidateRepository.aggregate<{
      average: number
      passed: number
      failed: number
    }>([
      { $match: { deletedAt: null, 'skillMatch.percentage': { $exists: true } } },
      {
        $group: {
          _id: null,
          average: { $avg: '$skillMatch.percentage' },
          passed: { $sum: { $cond: ['$skillMatch.passed', 1, 0] } },
          failed: { $sum: { $cond: ['$skillMatch.passed', 0, 1] } },
        },
      },
    ])
    return this.normalizeMatchStats(result)
  }

  private async salaryMatchStats(): Promise<MatchStats> {
    const [result] = await this.candidateRepository.aggregate<{
      average: number
      passed: number
      failed: number
    }>([
      {
        $match: {
          deletedAt: null,
          'salaryMatch.percentage': { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$salaryMatch.percentage' },
          passed: { $sum: { $cond: ['$salaryMatch.passed', 1, 0] } },
          failed: { $sum: { $cond: ['$salaryMatch.passed', 0, 1] } },
        },
      },
    ])
    return this.normalizeMatchStats(result)
  }

  private async testStatistics() {
    const [taken, avg] = await Promise.all([
      this.aptitudeRepository.aggregate<StatusCount>([
        { $match: { deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.aptitudeRepository.aggregate<{
        avgPercentage: number
        avgRisk: number
        totalViolations: number
      }>([
        {
          $match: {
            deletedAt: null,
            status: AptitudeTestStatus.SUBMITTED,
          },
        },
        {
          $group: {
            _id: null,
            avgPercentage: { $avg: '$percentage' },
            avgRisk: { $avg: '$riskScore' },
            totalViolations: { $sum: '$violationCount' },
          },
        },
      ]),
    ])

    const byStatus = Object.fromEntries(taken.map((i) => [i._id, i.count]))
    const summary = avg[0] ?? {
      avgPercentage: 0,
      avgRisk: 0,
      totalViolations: 0,
    }

    return {
      byStatus,
      averagePercentage: Math.round(summary.avgPercentage ?? 0),
      averageRiskScore: Math.round(summary.avgRisk ?? 0),
      totalViolations: summary.totalViolations ?? 0,
    }
  }

  private async emailStatistics() {
    const [sent, failed, pending] = await Promise.all([
      this.emailLogRepository.countBy({ status: EmailStatus.SENT }),
      this.emailLogRepository.countBy({ status: EmailStatus.FAILED }),
      this.emailLogRepository.countBy({ status: EmailStatus.PENDING }),
    ])
    return { sent, failed, pending, total: sent + failed + pending }
  }

  private normalizeMatchStats(result?: {
    average: number
    passed: number
    failed: number
  }): MatchStats {
    if (!result) return { average: 0, passed: 0, failed: 0 }
    return {
      average: Math.round(result.average ?? 0),
      passed: result.passed ?? 0,
      failed: result.failed ?? 0,
    }
  }
}
