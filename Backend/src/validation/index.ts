import { z } from 'zod'

export type ValidationErrorDetail = {
  message: string
  field: string
}

export type RequestValidationSchema = {
  body?: z.ZodTypeAny
  params?: z.ZodTypeAny
  query?: z.ZodTypeAny
}
