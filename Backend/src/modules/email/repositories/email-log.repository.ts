import { injectable } from 'inversify'
import { FilterQuery } from 'mongoose'
import { IEmailLog, EmailLog } from '@/modules/email/models/email-log.model'
import { IRepository } from '@/repositories/base.repository'

@injectable()
export class EmailLogRepository extends IRepository<IEmailLog> {
  constructor() {
    super(EmailLog)
  }

  async findByCandidate(candidateId: string) {
    return this.model
      .find({ candidate: candidateId, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
  }

  async countBy(filter: FilterQuery<IEmailLog>) {
    return this.model.countDocuments({ ...filter, deletedAt: null })
  }
}
