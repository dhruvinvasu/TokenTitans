import { injectable } from 'inversify'
import { AuditLog, IAuditLog } from '@/modules/audit/models/audit-log.model'
import { IRepository } from '@/repositories/base.repository'

@injectable()
export class AuditRepository extends IRepository<IAuditLog> {
  constructor() {
    super(AuditLog)
  }

  async findByEntity(entity: string, entityId: string) {
    return this.model
      .find({ entity, entityId, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
  }
}
