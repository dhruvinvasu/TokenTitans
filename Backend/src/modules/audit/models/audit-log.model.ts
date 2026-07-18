import { model, Schema, Types } from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { BaseSchema, IBaseModel } from '@/models/base.model'

export interface IAuditLog extends IBaseModel {
  _id: Types.ObjectId
  actor?: Types.ObjectId
  actorEmail?: string
  action: string
  entity: string
  entityId?: string
  meta?: Record<string, unknown>
}

const auditLogSchema = new Schema<IAuditLog>({
  actor: { type: Schema.Types.ObjectId, ref: modelNames.USER.modelName },
  actorEmail: { type: String, trim: true, lowercase: true },
  action: { type: String, required: true, trim: true, index: true },
  entity: { type: String, required: true, trim: true, index: true },
  entityId: { type: String, index: true },
  meta: { type: Schema.Types.Mixed },
})

auditLogSchema.add(BaseSchema)

export const AuditLog = model<IAuditLog>(
  modelNames.AUDIT_LOG.modelName,
  auditLogSchema,
  modelNames.AUDIT_LOG.collectionName,
)
