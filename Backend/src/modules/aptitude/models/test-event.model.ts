import { model, Schema, Types } from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { BaseSchema, IBaseModel } from '@/models/base.model'

export enum TestEventCategory {
  VIOLATION = 'VIOLATION',
  TELEMETRY = 'TELEMETRY',
}

export interface ITestEvent extends IBaseModel {
  _id: Types.ObjectId
  test: Types.ObjectId
  candidate: Types.ObjectId
  category: TestEventCategory
  type: string
  weight: number
  occurredAt: Date
  meta?: Record<string, unknown>
}

const testEventSchema = new Schema<ITestEvent>({
  test: {
    type: Schema.Types.ObjectId,
    ref: modelNames.APTITUDE_TEST.modelName,
    required: true,
    index: true,
  },
  candidate: {
    type: Schema.Types.ObjectId,
    ref: modelNames.CANDIDATE.modelName,
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: Object.values(TestEventCategory),
    required: true,
    index: true,
  },
  type: { type: String, required: true, index: true },
  weight: { type: Number, default: 0 },
  occurredAt: { type: Date, required: true },
  meta: { type: Schema.Types.Mixed },
})

testEventSchema.add(BaseSchema)

export const TestEvent = model<ITestEvent>(
  modelNames.TEST_EVENT.modelName,
  testEventSchema,
  modelNames.TEST_EVENT.collectionName,
)
