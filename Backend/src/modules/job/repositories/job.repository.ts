import { injectable } from 'inversify'
import { IJob, Job } from '@/modules/job/models/job.model'
import { IRepository } from '@/repositories/base.repository'

@injectable()
export class JobRepository extends IRepository<IJob> {
  constructor() {
    super(Job)
  }

  async findActive() {
    return this.model
      .find({ isActive: true, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
  }

  async findByIdActive(id: string) {
    return this.model.findOne({ _id: id, deletedAt: null })
  }
}
