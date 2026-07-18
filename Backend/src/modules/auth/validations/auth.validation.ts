import { z } from 'zod'
import {
  emailSchema,
  nameSchema,
  otpSchema,
  passwordSchema,
  phoneNumberSchema,
  roleSchema,
} from '@/validation/common.validation'

export const RegisterSchema = {
  body: z.object({
    firstName: nameSchema('First name'),
    lastName: nameSchema('Last name'),
    email: emailSchema,
    password: passwordSchema,
    role: roleSchema,
    phoneNumber: phoneNumberSchema.optional(),
  }),
}

export const LoginSchema = {
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),
}

export const ForgotPasswordSchema = {
  body: z.object({
    email: emailSchema,
  }),
}

export const VerifyOtpSchema = {
  body: z.object({
    email: emailSchema,
    otp: otpSchema,
  }),
}

export const ChangePasswordSchema = {
  body: z.object({
    email: emailSchema,
    otp: otpSchema,
    newPassword: passwordSchema,
  }),
}
