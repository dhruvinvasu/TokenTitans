import { Router } from 'express'
import { asyncWrapper } from '@/middlewares/async.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { authorize } from '@/middlewares/authorize.middleware'
import { resumeUpload } from '@/middlewares/upload.middleware'
import validate from '@/middlewares/validate-middleware'
import { container } from '@/inversify.config'
import { CandidateController } from '@/modules/candidate/controllers/candidate.controller'
import {
  AddNoteSchema,
  ApplyCandidateSchema,
  AssignRecruiterSchema,
  CandidateIdSchema,
  CandidateListSchema,
  InterviewFeedbackSchema,
  RejectCandidateSchema,
  ScheduleInterviewSchema,
  SendOfferSchema,
} from '@/modules/candidate/validations/candidate.validation'
import { RoleName } from '@/modules/role/constants/role.constants'
import { TYPES } from '@/types/di.types'

const router = Router()
const candidateController = container.get<CandidateController>(
  TYPES.CandidateController,
)

// Public — candidate application intake (multipart resume upload).
router.post(
  '/apply',
  resumeUpload.single('resume'),
  validate(ApplyCandidateSchema),
  asyncWrapper(candidateController.apply),
)

// HR management.
router.use(authMiddleware(), authorize(RoleName.HR))

router.get(
  '/',
  validate(CandidateListSchema),
  asyncWrapper(candidateController.list),
)
router.get(
  '/:candidateId',
  validate(CandidateIdSchema),
  asyncWrapper(candidateController.getDetails),
)
router.get(
  '/:candidateId/export',
  validate(CandidateIdSchema),
  asyncWrapper(candidateController.export),
)
router.post(
  '/:candidateId/notes',
  validate(AddNoteSchema),
  asyncWrapper(candidateController.addNote),
)
router.patch(
  '/:candidateId/recruiter',
  validate(AssignRecruiterSchema),
  asyncWrapper(candidateController.assignRecruiter),
)
router.post(
  '/:candidateId/interview',
  validate(ScheduleInterviewSchema),
  asyncWrapper(candidateController.scheduleInterview),
)
router.post(
  '/:candidateId/interview/feedback',
  validate(InterviewFeedbackSchema),
  asyncWrapper(candidateController.addInterviewFeedback),
)
router.post(
  '/:candidateId/offer',
  validate(SendOfferSchema),
  asyncWrapper(candidateController.sendOffer),
)
router.patch(
  '/:candidateId/joined',
  validate(CandidateIdSchema),
  asyncWrapper(candidateController.markJoined),
)
router.patch(
  '/:candidateId/reject',
  validate(RejectCandidateSchema),
  asyncWrapper(candidateController.reject),
)
router.patch(
  '/:candidateId/archive',
  validate(CandidateIdSchema),
  asyncWrapper(candidateController.archive),
)
router.delete(
  '/:candidateId',
  validate(CandidateIdSchema),
  asyncWrapper(candidateController.delete),
)

export default router
