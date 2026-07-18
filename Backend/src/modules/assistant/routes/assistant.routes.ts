import { Router } from 'express'
import { asyncWrapper } from '@/middlewares/async.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { authorize } from '@/middlewares/authorize.middleware'
import validate from '@/middlewares/validate-middleware'
import { container } from '@/inversify.config'
import { AssistantController } from '@/modules/assistant/controllers/assistant.controller'
import { AskAssistantSchema } from '@/modules/assistant/validations/assistant.validation'
import { RoleName } from '@/modules/role/constants/role.constants'
import { TYPES } from '@/types/di.types'

const router = Router()
const assistantController = container.get<AssistantController>(
  TYPES.AssistantController,
)

router.use(authMiddleware(), authorize(RoleName.HR))

router.post(
  '/ask',
  validate(AskAssistantSchema),
  asyncWrapper(assistantController.ask),
)

export default router
