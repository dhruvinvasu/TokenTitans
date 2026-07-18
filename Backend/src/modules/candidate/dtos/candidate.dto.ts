import { z } from 'zod'
import {
  ApplyCandidateSchema,
  AssignRecruiterSchema,
  CandidateListSchema,
  ScheduleInterviewSchema,
  SendOfferSchema,
} from '@/modules/candidate/validations/candidate.validation'

export type ApplyCandidateDTO = z.infer<typeof ApplyCandidateSchema.body>

export type CandidateListQueryDTO = z.infer<typeof CandidateListSchema.query>

export type AssignRecruiterDTO = z.infer<typeof AssignRecruiterSchema.body>

export type ScheduleInterviewDTO = z.infer<typeof ScheduleInterviewSchema.body>

export type SendOfferDTO = z.infer<typeof SendOfferSchema.body>
