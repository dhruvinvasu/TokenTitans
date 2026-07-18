import { model, Schema, Types } from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { BaseSchema, IBaseModel } from '@/models/base.model'

export enum TimelineActor {
  SYSTEM = 'SYSTEM',
  HR = 'HR',
  CANDIDATE = 'CANDIDATE',
}

export interface ICandidateTimeline extends IBaseModel {
  _id: Types.ObjectId
  candidate: Types.ObjectId
  event: string
  fromStatus?: string
  toStatus?: string
  actorType: TimelineActor
  actor?: Types.ObjectId
  message: string
  meta?: Record<string, unknown>
}

const candidateTimelineSchema = new Schema<ICandidateTimeline>({
  candidate: {
    type: Schema.Types.ObjectId,
    ref: modelNames.CANDIDATE.modelName,
    required: true,
    index: true,
  },
  event: { type: String, required: true, trim: true },
  fromStatus: { type: String },
  toStatus: { type: String },
  actorType: {
    type: String,
    enum: Object.values(TimelineActor),
    default: TimelineActor.SYSTEM,
  },
  actor: { type: Schema.Types.ObjectId, ref: modelNames.USER.modelName },
  message: { type: String, required: true },
  meta: { type: Schema.Types.Mixed },
})

candidateTimelineSchema.add(BaseSchema)

export const CandidateTimeline = model<ICandidateTimeline>(
  modelNames.CANDIDATE_TIMELINE.modelName,
  candidateTimelineSchema,
  modelNames.CANDIDATE_TIMELINE.collectionName,
)
