import { z } from 'zod'
import { isValidMongoId } from '@/utils/validation.utils'

const salaryRangeSchema = z
  .object({
    min: z.number().nonnegative('Minimum salary must be zero or greater'),
    max: z.number().nonnegative('Maximum salary must be zero or greater'),
    currency: z.string().trim().min(1).default('INR'),
  })
  .refine((range) => range.max >= range.min, {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['max'],
  })

const jobIdParams = z.object({
  jobId: z.string().refine(isValidMongoId, { message: 'Invalid job ID' }),
})

export const CreateJobSchema = {
  body: z.object({
    title: z.string().trim().min(2, 'Title must be at least 2 characters'),
    role: z.string().trim().min(2, 'Role must be at least 2 characters'),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters'),
    requiredSkills: z
      .array(z.string().trim().min(1))
      .min(1, 'At least one required skill is needed'),
    experienceRequired: z.number().int().nonnegative().default(0),
    salaryRange: salaryRangeSchema,
    location: z.string().trim().optional(),
    skillMatchThreshold: z.number().min(0).max(100).optional(),
    salaryMatchThreshold: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
  }),
}

export const UpdateJobSchema = {
  params: jobIdParams,
  body: z
    .object({
      title: z.string().trim().min(2).optional(),
      role: z.string().trim().min(2).optional(),
      description: z.string().trim().min(10).optional(),
      requiredSkills: z.array(z.string().trim().min(1)).min(1).optional(),
      experienceRequired: z.number().int().nonnegative().optional(),
      salaryRange: salaryRangeSchema.optional(),
      location: z.string().trim().optional(),
      skillMatchThreshold: z.number().min(0).max(100).optional(),
      salaryMatchThreshold: z.number().min(0).max(100).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
}

export const GetJobSchema = { params: jobIdParams }

export const DeleteJobSchema = { params: jobIdParams }
