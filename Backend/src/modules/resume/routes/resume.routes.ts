import { Router } from 'express'
import { asyncWrapper } from '@/middlewares/async.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { authorize } from '@/middlewares/authorize.middleware'
import validate from '@/middlewares/validate-middleware'
import { container } from '@/inversify.config'
import { ResumeController } from '@/modules/resume/controllers/resume.controller'
import { ResumeByCandidateSchema } from '@/modules/resume/validations/resume.validation'
import { RoleName } from '@/modules/role/constants/role.constants'
import { TYPES } from '@/types/di.types'

const router = Router()
const resumeController = container.get<ResumeController>(TYPES.ResumeController)

router.use(authMiddleware(), authorize(RoleName.HR))

router.get(
  '/:candidateId',
  validate(ResumeByCandidateSchema),
  asyncWrapper(resumeController.getByCandidate),
)
router.get(
  '/:candidateId/download',
  validate(ResumeByCandidateSchema),
  asyncWrapper(resumeController.download),
)

export default router
