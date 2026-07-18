import { z } from 'zod'

export const nameSchema = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .min(2, `${fieldLabel} must be at least 2 characters`)
    .max(50, `${fieldLabel} must not exceed 50 characters`)

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password must not exceed 64 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const roleSchema = z.string().trim().min(1, 'Role is required')

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'OTP must be a 6-digit number')

export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number')
