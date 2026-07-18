import { model, Schema, Types } from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { BaseSchema, IBaseModel } from '@/models/base.model'
import {
  AptitudeTestStatus,
  TestRecommendation,
} from '@/modules/aptitude/constants/aptitude.constants'

export interface IAptitudeQuestion {
  question: string
  options: string[]
  correctIndex: number
  skillTag?: string
}

export interface IAptitudeAnswer {
  questionIndex: number
  selectedIndex: number
  answeredAt: Date
}

export interface IAptitudeTest extends IBaseModel {
  _id: Types.ObjectId
  candidate: Types.ObjectId
  job: Types.ObjectId
  token: string
  status: AptitudeTestStatus
  durationMinutes: number
  totalQuestions: number
  maxViolations: number
  questions: IAptitudeQuestion[]
  answers: IAptitudeAnswer[]
  sentAt?: Date
  expiresAt: Date
  startedAt?: Date
  deadlineAt?: Date
  submittedAt?: Date
  score: number
  percentage: number
  correctCount: number
  wrongCount: number
  timeTakenSeconds: number
  violationCount: number
  riskScore: number
  recommendation?: TestRecommendation
  resumeAllowed: boolean
  resumeCount: number
}

const questionSchema = new Schema<IAptitudeQuestion>(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    // Hidden by default so the correct answer is never leaked to the candidate.
    correctIndex: { type: Number, required: true, select: false },
    skillTag: { type: String, trim: true },
  },
  { _id: false },
)

const answerSchema = new Schema<IAptitudeAnswer>(
  {
    questionIndex: { type: Number, required: true },
    selectedIndex: { type: Number, required: true },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const aptitudeTestSchema = new Schema<IAptitudeTest>({
  candidate: {
    type: Schema.Types.ObjectId,
    ref: modelNames.CANDIDATE.modelName,
    required: true,
    index: true,
  },
  job: {
    type: Schema.Types.ObjectId,
    ref: modelNames.JOB.modelName,
    required: true,
  },
  token: { type: String, required: true, unique: true, index: true },
  status: {
    type: String,
    enum: Object.values(AptitudeTestStatus),
    default: AptitudeTestStatus.PENDING,
    index: true,
  },
  durationMinutes: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  maxViolations: { type: Number, required: true },
  questions: { type: [questionSchema], default: [] },
  answers: { type: [answerSchema], default: [] },
  sentAt: { type: Date },
  expiresAt: { type: Date, required: true },
  startedAt: { type: Date },
  deadlineAt: { type: Date },
  submittedAt: { type: Date },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  wrongCount: { type: Number, default: 0 },
  timeTakenSeconds: { type: Number, default: 0 },
  violationCount: { type: Number, default: 0 },
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  recommendation: { type: String, enum: Object.values(TestRecommendation) },
  resumeAllowed: { type: Boolean, default: true },
  resumeCount: { type: Number, default: 0 },
})

aptitudeTestSchema.add(BaseSchema)

export const AptitudeTest = model<IAptitudeTest>(
  modelNames.APTITUDE_TEST.modelName,
  aptitudeTestSchema,
  modelNames.APTITUDE_TEST.collectionName,
)
