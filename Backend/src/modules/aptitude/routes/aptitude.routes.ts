import { Router } from 'express'
import { asyncWrapper } from '@/middlewares/async.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { authorize } from '@/middlewares/authorize.middleware'
import validate from '@/middlewares/validate-middleware'
import { container } from '@/inversify.config'
import { AptitudeController } from '@/modules/aptitude/controllers/aptitude.controller'
import {
  AptitudeCandidateSchema,
  ExtendTestSchema,
  RecordEventsSchema,
  StartTestSchema,
  SubmitTestSchema,
  TokenParamsSchema,
} from '@/modules/aptitude/validations/aptitude.validation'
import { RoleName } from '@/modules/role/constants/role.constants'
import { TYPES } from '@/types/di.types'

const router = Router()
const aptitudeController = container.get<AptitudeController>(
  TYPES.AptitudeController,
)

// HR-facing routes (mounted first with an explicit prefix so token routes
// below can never shadow them).
router.get(
  '/hr/report/:candidateId',
  authMiddleware(),
  authorize(RoleName.HR),
  validate(AptitudeCandidateSchema),
  asyncWrapper(aptitudeController.report),
)
router.post(
  '/hr/reset/:candidateId',
  authMiddleware(),
  authorize(RoleName.HR),
  validate(AptitudeCandidateSchema),
  asyncWrapper(aptitudeController.reset),
)
router.post(
  '/hr/extend/:candidateId',
  authMiddleware(),
  authorize(RoleName.HR),
  validate(ExtendTestSchema),
  asyncWrapper(aptitudeController.extend),
)

// Candidate-facing routes secured by the secure test token.
router.get(
  '/:token',
  validate(TokenParamsSchema),
  asyncWrapper(aptitudeController.getForCandidate),
)
router.post(
  '/:token/start',
  validate(StartTestSchema),
  asyncWrapper(aptitudeController.start),
)
router.post(
  '/:token/events',
  validate(RecordEventsSchema),
  asyncWrapper(aptitudeController.recordEvents),
)
router.post(
  '/:token/submit',
  validate(SubmitTestSchema),
  asyncWrapper(aptitudeController.submit),
)

export default router
