import { z } from 'zod'

export const AskAssistantSchema = {
  body: z.object({
    question: z
      .string()
      .trim()
      .min(3, 'Question must be at least 3 characters')
      .max(500, 'Question must not exceed 500 characters'),
  }),
}
