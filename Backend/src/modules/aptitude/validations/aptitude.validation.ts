import { z } from 'zod'
import {
  TestEventCategory,
} from '@/modules/aptitude/models/test-event.model'
import { isValidMongoId } from '@/utils/validation.utils'

const tokenParams = z.object({
  token: z.string().trim().min(10, 'Invalid test token'),
})

const candidateIdParams = z.object({
  candidateId: z
    .string()
    .refine(isValidMongoId, { message: 'Invalid candidate ID' }),
})

export const TokenParamsSchema = { params: tokenParams }

export const StartTestSchema = { params: tokenParams }

export const SubmitTestSchema = {
  params: tokenParams,
  body: z.object({
    answers: z
      .array(
        z.object({
          questionIndex: z.number().int().nonnegative(),
          selectedIndex: z.number().int().min(0).max(3),
        }),
      )
      .default([]),
    autoSubmitted: z.boolean().optional(),
  }),
}

export const RecordEventsSchema = {
  params: tokenParams,
  body: z.object({
    events: z
      .array(
        z.object({
          category: z.nativeEnum(TestEventCategory),
          type: z.string().trim().min(1),
          occurredAt: z.string().datetime().optional(),
          meta: z.record(z.unknown()).optional(),
        }),
      )
      .min(1, 'At least one event is required'),
  }),
}

export const AptitudeCandidateSchema = { params: candidateIdParams }

export const ExtendTestSchema = {
  params: candidateIdParams,
  body: z.object({
    days: z.number().int().positive().max(30).default(2),
  }),
}
