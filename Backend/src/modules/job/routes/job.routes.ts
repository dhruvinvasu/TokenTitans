import { Router } from 'express'
import { asyncWrapper } from '@/middlewares/async.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { authorize } from '@/middlewares/authorize.middleware'
import validate from '@/middlewares/validate-middleware'
import { container } from '@/inversify.config'
import { RoleName } from '@/modules/role/constants/role.constants'
import { JobController } from '@/modules/job/controllers/job.controller'
import {
  CreateJobSchema,
  DeleteJobSchema,
  GetJobSchema,
  UpdateJobSchema,
} from '@/modules/job/validations/job.validation'
import { TYPES } from '@/types/di.types'

const router = Router()
const jobController = container.get<JobController>(TYPES.JobController)

// Public — candidates browse open positions before applying.
router.get('/active', asyncWrapper(jobController.listActive))
router.get('/:jobId', validate(GetJobSchema), asyncWrapper(jobController.getById))

// HR management.
router.use(authMiddleware(), authorize(RoleName.HR))

router.get('/', asyncWrapper(jobController.list))
router.post('/', validate(CreateJobSchema), asyncWrapper(jobController.create))
router.put(
  '/:jobId',
  validate(UpdateJobSchema),
  asyncWrapper(jobController.update),
)
router.delete(
  '/:jobId',
  validate(DeleteJobSchema),
  asyncWrapper(jobController.delete),
)

export default router
