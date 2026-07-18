import { z } from 'zod'
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  VerifyOtpSchema,
} from '@/modules/auth/validations/auth.validation'

export type RegisterDTO = z.infer<typeof RegisterSchema.body>

export type LoginDTO = z.infer<typeof LoginSchema.body>

export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordSchema.body>

export type VerifyOtpDTO = z.infer<typeof VerifyOtpSchema.body>

export type ChangePasswordDTO = z.infer<typeof ChangePasswordSchema.body>
