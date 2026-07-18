import { inject, injectable } from 'inversify'
import { AuditRepository } from '@/modules/audit/repositories/audit.repository'
import { TYPES } from '@/types/di.types'
import { logger } from '@/utils/logger.util'

export interface RecordAuditInput {
  action: string
  entity: string
  entityId?: string
  actor?: string
  actorEmail?: string
  meta?: Record<string, unknown>
}

@injectable()
export class AuditService {
  constructor(
    @inject(TYPES.AuditRepository)
    private readonly auditRepository: AuditRepository,
  ) {}

  /**
   * Audit writes must never break the primary request flow, so failures are
   * logged and swallowed rather than propagated.
   */
  async record(input: RecordAuditInput) {
    try {
      await this.auditRepository.create({
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        actor: input.actor ? (input.actor as unknown as never) : undefined,
        actorEmail: input.actorEmail,
        meta: input.meta,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to write audit log: ${message}`)
    }
  }

  async listForEntity(entity: string, entityId: string) {
    return this.auditRepository.findByEntity(entity, entityId)
  }
}
