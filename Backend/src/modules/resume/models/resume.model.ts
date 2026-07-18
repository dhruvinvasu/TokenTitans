import { model, Schema, Types } from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { BaseSchema, IBaseModel } from '@/models/base.model'

export interface IEducation {
  degree?: string
  institution?: string
  year?: string
}

export interface IProject {
  name?: string
  description?: string
  technologies?: string[]
}

export interface IResumeAnalysis {
  skills: string[]
  experienceYears: number
  education: IEducation[]
  certifications: string[]
  projects: IProject[]
  keywords: string[]
  previousCompanies: string[]
  summary: string
}

export interface IResume extends IBaseModel {
  _id: Types.ObjectId
  candidate: Types.ObjectId
  originalName: string
  storedName: string
  path: string
  mimeType: string
  size: number
  rawText: string
  analysis?: IResumeAnalysis
  parsedAt?: Date
}

const educationSchema = new Schema<IEducation>(
  {
    degree: { type: String, trim: true },
    institution: { type: String, trim: true },
    year: { type: String, trim: true },
  },
  { _id: false },
)

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    technologies: { type: [String], default: [] },
  },
  { _id: false },
)

const analysisSchema = new Schema<IResumeAnalysis>(
  {
    skills: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0, min: 0 },
    education: { type: [educationSchema], default: [] },
    certifications: { type: [String], default: [] },
    projects: { type: [projectSchema], default: [] },
    keywords: { type: [String], default: [] },
    previousCompanies: { type: [String], default: [] },
    summary: { type: String, default: '' },
  },
  { _id: false },
)

const resumeSchema = new Schema<IResume>({
  candidate: {
    type: Schema.Types.ObjectId,
    ref: modelNames.CANDIDATE.modelName,
    required: true,
    index: true,
  },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true },
  path: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  rawText: { type: String, default: '' },
  analysis: { type: analysisSchema },
  parsedAt: { type: Date },
})

resumeSchema.add(BaseSchema)

export const Resume = model<IResume>(
  modelNames.RESUME.modelName,
  resumeSchema,
  modelNames.RESUME.collectionName,
)
