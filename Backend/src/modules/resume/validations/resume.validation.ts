import { z } from 'zod'
import { isValidMongoId } from '@/utils/validation.utils'

export const ResumeByCandidateSchema = {
  params: z.object({
    candidateId: z
      .string()
      .refine(isValidMongoId, { message: 'Invalid candidate ID' }),
  }),
}
