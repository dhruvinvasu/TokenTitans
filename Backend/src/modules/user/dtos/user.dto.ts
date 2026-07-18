import { z } from 'zod'
import {
  CreateUserSchema,
  GetUserSchema,
  UpdateUserSchema,
} from '@/modules/user/validations/user.validation'

export type CreateUserDTO = z.infer<typeof CreateUserSchema.body>

export type UpdateUserDTO = z.infer<typeof UpdateUserSchema.body>

export type UserIdParamsDTO = z.infer<typeof GetUserSchema.params>
