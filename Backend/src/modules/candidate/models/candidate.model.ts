import { model, Schema, Types } from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { BaseSchema, IBaseModel } from '@/models/base.model'
import {
  CandidateStatus,
  RejectionStage,
} from '@/modules/candidate/constants/candidate.constants'

export interface ISkillMatch {
  percentage: number
  matchedSkills: string[]
  missingSkills: string[]
  strongSkills: string[]
  analysis: string
  passed: boolean
}

export interface ISalaryMatch {
  percentage: number
  expectedWithinRange: boolean
  analysis: string
  passed: boolean
}

/** Resume-derived snapshot denormalised for fast querying by the AI assistant. */
export interface ICandidateProfile {
  skills: string[]
  experienceYears: number
  location?: string
  previousCompanies: string[]
}

export interface ICandidateNote {
  author: Types.ObjectId
  text: string
  createdAt: Date
}

export interface IInterview {
  scheduledAt?: Date
  mode?: string
  location?: string
  feedback?: string
  rescheduledCount: number
}

export enum OfferStatus {
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export interface IOffer {
  sentAt?: Date
  ctc?: number
  joiningDate?: Date
  status?: OfferStatus
}

export interface ICandidate extends IBaseModel {
  _id: Types.ObjectId
  fullName: string
  email: string
  phoneNumber?: string
  currentCtc: number
  expectedCtc: number
  job: Types.ObjectId
  resume?: Types.ObjectId
  status: CandidateStatus
  profile?: ICandidateProfile
  skillMatch?: ISkillMatch
  salaryMatch?: ISalaryMatch
  rejectionReason?: string
  rejectionStage?: RejectionStage
  rejectedAt?: Date
  riskScore: number
  assignedRecruiter?: Types.ObjectId
  notes: ICandidateNote[]
  interview?: IInterview
  offer?: IOffer
  archivedAt?: Date
}

const profileSchema = new Schema<ICandidateProfile>(
  {
    skills: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0, min: 0 },
    location: { type: String, trim: true },
    previousCompanies: { type: [String], default: [] },
  },
  { _id: false },
)

const skillMatchSchema = new Schema<ISkillMatch>(
  {
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    strongSkills: { type: [String], default: [] },
    analysis: { type: String, default: '' },
    passed: { type: Boolean, default: false },
  },
  { _id: false },
)

const salaryMatchSchema = new Schema<ISalaryMatch>(
  {
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    expectedWithinRange: { type: Boolean, default: false },
    analysis: { type: String, default: '' },
    passed: { type: Boolean, default: false },
  },
  { _id: false },
)

const noteSchema = new Schema<ICandidateNote>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: modelNames.USER.modelName,
      required: true,
    },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const interviewSchema = new Schema<IInterview>(
  {
    scheduledAt: { type: Date },
    mode: { type: String, trim: true },
    location: { type: String, trim: true },
    feedback: { type: String, trim: true },
    rescheduledCount: { type: Number, default: 0 },
  },
  { _id: false },
)

const offerSchema = new Schema<IOffer>(
  {
    sentAt: { type: Date },
    ctc: { type: Number, min: 0 },
    joiningDate: { type: Date },
    status: { type: String, enum: Object.values(OfferStatus) },
  },
  { _id: false },
)

const candidateSchema = new Schema<ICandidate>({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  phoneNumber: { type: String, trim: true },
  currentCtc: { type: Number, required: true, min: 0 },
  expectedCtc: { type: Number, required: true, min: 0 },
  job: {
    type: Schema.Types.ObjectId,
    ref: modelNames.JOB.modelName,
    required: true,
    index: true,
  },
  resume: { type: Schema.Types.ObjectId, ref: modelNames.RESUME.modelName },
  status: {
    type: String,
    enum: Object.values(CandidateStatus),
    default: CandidateStatus.APPLIED,
    index: true,
  },
  profile: { type: profileSchema },
  skillMatch: { type: skillMatchSchema },
  salaryMatch: { type: salaryMatchSchema },
  rejectionReason: { type: String, trim: true },
  rejectionStage: { type: String, enum: Object.values(RejectionStage) },
  rejectedAt: { type: Date },
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  assignedRecruiter: {
    type: Schema.Types.ObjectId,
    ref: modelNames.USER.modelName,
  },
  notes: { type: [noteSchema], default: [] },
  interview: { type: interviewSchema },
  offer: { type: offerSchema },
  archivedAt: { type: Date },
})

candidateSchema.add(BaseSchema)

candidateSchema.index({ email: 1, job: 1 })
candidateSchema.index({ 'skillMatch.percentage': 1 })

export const Candidate = model<ICandidate>(
  modelNames.CANDIDATE.modelName,
  candidateSchema,
  modelNames.CANDIDATE.collectionName,
)
