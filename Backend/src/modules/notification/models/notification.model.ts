import { model, Schema, Types } from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { BaseSchema, IBaseModel } from '@/models/base.model'

export enum NotificationType {
  CANDIDATE_APPLIED = 'CANDIDATE_APPLIED',
  SKILL_REJECTED = 'SKILL_REJECTED',
  SALARY_REJECTED = 'SALARY_REJECTED',
  TEST_COMPLETED = 'TEST_COMPLETED',
  TEST_FAILED = 'TEST_FAILED',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  CANDIDATE_SUPPORT = 'CANDIDATE_SUPPORT',
}

export interface INotification extends IBaseModel {
  _id: Types.ObjectId
  type: NotificationType
  title: string
  message: string
  candidate?: Types.ObjectId
  read: boolean
  meta?: Record<string, unknown>
}

const notificationSchema = new Schema<INotification>({
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true,
    index: true,
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  candidate: {
    type: Schema.Types.ObjectId,
    ref: modelNames.CANDIDATE.modelName,
    index: true,
  },
  read: { type: Boolean, default: false, index: true },
  meta: { type: Schema.Types.Mixed },
})

notificationSchema.add(BaseSchema)

export const Notification = model<INotification>(
  modelNames.NOTIFICATION.modelName,
  notificationSchema,
  modelNames.NOTIFICATION.collectionName,
)
