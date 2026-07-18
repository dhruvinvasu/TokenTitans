import { model, Schema, Types } from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { BaseSchema, IBaseModel } from '@/models/base.model'

export interface ISalaryRange {
  min: number
  max: number
  currency: string
}

export interface IJob extends IBaseModel {
  _id: Types.ObjectId
  title: string
  role: string
  description: string
  requiredSkills: string[]
  experienceRequired: number
  salaryRange: ISalaryRange
  location?: string
  skillMatchThreshold: number
  salaryMatchThreshold: number
  isActive: boolean
  createdBy: Types.ObjectId
}

const salaryRangeSchema = new Schema<ISalaryRange>(
  {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR', trim: true },
  },
  { _id: false },
)

const jobSchema = new Schema<IJob>({
  title: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true, index: true },
  description: { type: String, required: true, trim: true },
  requiredSkills: {
    type: [String],
    required: true,
    default: [],
    set: (skills: string[]) => skills.map((skill) => skill.trim()),
  },
  experienceRequired: { type: Number, default: 0, min: 0 },
  salaryRange: { type: salaryRangeSchema, required: true },
  location: { type: String, trim: true },
  skillMatchThreshold: { type: Number, default: 70, min: 0, max: 100 },
  salaryMatchThreshold: { type: Number, default: 80, min: 0, max: 100 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: modelNames.USER.modelName,
    required: true,
  },
})

jobSchema.add(BaseSchema)

export const Job = model<IJob>(
  modelNames.JOB.modelName,
  jobSchema,
  modelNames.JOB.collectionName,
)
