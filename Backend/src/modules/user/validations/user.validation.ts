import { z } from 'zod'
import { isValidMongoId } from '@/utils/validation.utils'
import { roleSchema } from '@/validation/common.validation'

export const CreateUserSchema = {
  body: z.object({
    firstName: z
      .string()
      .trim()
      .min(2, 'First name must be at least 2 characters'),
    lastName: z
      .string()
      .trim()
      .min(2, 'Last name must be at least 2 characters'),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: roleSchema,
  }),
}

export const UpdateUserSchema = {
  params: z.object({
    userId: z.string().refine(isValidMongoId, {
      message: 'Invalid user ID',
    }),
  }),
  body: z
    .object({
      firstName: z
        .string()
        .trim()
        .min(2, 'First name must be at least 2 characters')
        .optional(),
      lastName: z
        .string()
        .trim()
        .min(2, 'Last name must be at least 2 characters')
        .optional(),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Invalid email address')
        .optional(),
      password: z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .optional(),
    })
    .refine(
      (data) =>
        data.firstName !== undefined ||
        data.lastName !== undefined ||
        data.email !== undefined ||
        data.password !== undefined,
      { message: 'At least one field is required to update' },
    ),
}

export const GetUserSchema = {
  params: z.object({
    userId: z.string().refine(isValidMongoId, {
      message: 'Invalid user ID',
    }),
  }),
}

export const DeleteUserSchema = {
  params: z.object({
    userId: z.string().refine(isValidMongoId, {
      message: 'Invalid user ID',
    }),
  }),
}
