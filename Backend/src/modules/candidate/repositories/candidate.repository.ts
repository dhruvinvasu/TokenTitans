import { injectable } from 'inversify'
import { FilterQuery, PipelineStage } from 'mongoose'
import {
  Candidate,
  ICandidate,
} from '@/modules/candidate/models/candidate.model'
import { IRepository } from '@/repositories/base.repository'

export interface CandidateListOptions {
  page: number
  limit: number
  sort?: Record<string, 1 | -1>
}

@injectable()
export class CandidateRepository extends IRepository<ICandidate> {
  constructor() {
    super(Candidate)
  }

  /** Returns a hydrated (non-lean) document so it can be mutated and saved. */
  async findDocumentById(id: string) {
    return this.model.findOne({ _id: id, deletedAt: null })
  }

  async findByIdWithRelations(id: string) {
    return this.model
      .findOne({ _id: id, deletedAt: null })
      .populate('job')
      .populate('resume')
      .populate('assignedRecruiter', 'firstName lastName email')
      .lean()
  }

  async search(filter: FilterQuery<ICandidate>, options: CandidateListOptions) {
    const query = { ...filter, deletedAt: null }
    const [items, total] = await Promise.all([
      this.model
        .find(query)
        .populate('job', 'title role')
        .sort(options.sort ?? { createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .lean(),
      this.model.countDocuments(query),
    ])
    return { items, total }
  }

  async countBy(filter: FilterQuery<ICandidate>) {
    return this.model.countDocuments({ ...filter, deletedAt: null })
  }

  async aggregate<T>(pipeline: PipelineStage[]): Promise<T[]> {
    return this.model.aggregate<T>(pipeline)
  }

  async runReadOnlyQuery(
    filter: FilterQuery<ICandidate>,
    limit: number,
    sort?: Record<string, 1 | -1>,
  ) {
    return this.model
      .find({ ...filter, deletedAt: null })
      .populate('job', 'title role')
      .sort(sort ?? { createdAt: -1 })
      .limit(limit)
      .lean()
  }
}
