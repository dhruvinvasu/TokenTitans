import { z } from 'zod'
import { CandidateStatus } from '@/modules/candidate/constants/candidate.constants'
import { emailSchema, phoneNumberSchema } from '@/validation/common.validation'
import { isValidMongoId } from '@/utils/validation.utils'

const candidateIdParams = z.object({
  candidateId: z
    .string()
    .refine(isValidMongoId, { message: 'Invalid candidate ID' }),
})

// Multipart form fields arrive as strings, so numeric fields are coerced.
export const ApplyCandidateSchema = {
  body: z.object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    email: emailSchema,
    phoneNumber: phoneNumberSchema.optional(),
    currentCtc: z.coerce.number().nonnegative('Current CTC must be zero or greater'),
    expectedCtc: z.coerce
      .number()
      .nonnegative('Expected CTC must be zero or greater'),
    location: z.string().trim().optional(),
    jobId: z.string().refine(isValidMongoId, { message: 'Invalid job ID' }),
  }),
}

export const CandidateListSchema = {
  query: z.object({
    status: z.nativeEnum(CandidateStatus).optional(),
    jobId: z
      .string()
      .refine(isValidMongoId, { message: 'Invalid job ID' })
      .optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
}

export const CandidateIdSchema = { params: candidateIdParams }

export const AddNoteSchema = {
  params: candidateIdParams,
  body: z.object({
    text: z.string().trim().min(1, 'Note text is required'),
  }),
}

export const AssignRecruiterSchema = {
  params: candidateIdParams,
  body: z.object({
    recruiterId: z
      .string()
      .refine(isValidMongoId, { message: 'Invalid recruiter ID' }),
  }),
}

export const ScheduleInterviewSchema = {
  params: candidateIdParams,
  body: z.object({
    scheduledAt: z.string().datetime({ message: 'Invalid ISO datetime' }),
    mode: z.string().trim().min(1, 'Interview mode is required'),
    location: z.string().trim().optional(),
  }),
}

export const InterviewFeedbackSchema = {
  params: candidateIdParams,
  body: z.object({
    feedback: z.string().trim().min(1, 'Feedback is required'),
  }),
}

export const SendOfferSchema = {
  params: candidateIdParams,
  body: z.object({
    ctc: z.number().nonnegative('CTC must be zero or greater'),
    joiningDate: z
      .string()
      .datetime({ message: 'Invalid ISO datetime' })
      .optional(),
  }),
}

export const RejectCandidateSchema = {
  params: candidateIdParams,
  body: z.object({
    reason: z.string().trim().min(1, 'Rejection reason is required'),
  }),
}

export const ExtendTestSchema = {
  params: candidateIdParams,
  body: z.object({
    days: z.number().int().positive().max(30).default(2),
  }),
}
