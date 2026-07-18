import { model, Schema, Types } from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { BaseSchema, IBaseModel } from '@/models/base.model'

export enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface IEmailLog extends IBaseModel {
  _id: Types.ObjectId
  candidate?: Types.ObjectId
  to: string
  subject: string
  template: string
  status: EmailStatus
  providerMessageId?: string
  error?: string
  sentAt?: Date
  expiresAt?: Date
  meta?: Record<string, unknown>
}

const emailLogSchema = new Schema<IEmailLog>({
  candidate: {
    type: Schema.Types.ObjectId,
    ref: modelNames.CANDIDATE.modelName,
    index: true,
  },
  to: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true, trim: true },
  template: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: Object.values(EmailStatus),
    default: EmailStatus.PENDING,
    index: true,
  },
  providerMessageId: { type: String },
  error: { type: String },
  sentAt: { type: Date },
  expiresAt: { type: Date },
  meta: { type: Schema.Types.Mixed },
})

emailLogSchema.add(BaseSchema)

export const EmailLog = model<IEmailLog>(
  modelNames.EMAIL_LOG.modelName,
  emailLogSchema,
  modelNames.EMAIL_LOG.collectionName,
)
