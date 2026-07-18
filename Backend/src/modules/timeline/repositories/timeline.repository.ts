import { injectable } from 'inversify'
import {
  CandidateTimeline,
  ICandidateTimeline,
} from '@/modules/timeline/models/candidate-timeline.model'
import { IRepository } from '@/repositories/base.repository'

@injectable()
export class TimelineRepository extends IRepository<ICandidateTimeline> {
  constructor() {
    super(CandidateTimeline)
  }

  async findByCandidate(candidateId: string) {
    return this.model
      .find({ candidate: candidateId, deletedAt: null })
      .sort({ createdAt: 1 })
      .lean()
  }

  async listRecent(limit = 10) {
    return this.model
      .find({ deletedAt: null })
      .populate('candidate', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  }
}
