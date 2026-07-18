import { z } from 'zod'
import {
  CreateJobSchema,
  UpdateJobSchema,
} from '@/modules/job/validations/job.validation'

export type CreateJobDTO = z.infer<typeof CreateJobSchema.body>

export type UpdateJobDTO = z.infer<typeof UpdateJobSchema.body>
