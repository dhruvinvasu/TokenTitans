import { Router } from 'express'
import { asyncWrapper } from '@/middlewares/async.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { authorize } from '@/middlewares/authorize.middleware'
import { container } from '@/inversify.config'
import { NotificationController } from '@/modules/notification/controllers/notification.controller'
import { RoleName } from '@/modules/role/constants/role.constants'
import { TYPES } from '@/types/di.types'

const router = Router()
const notificationController = container.get<NotificationController>(
  TYPES.NotificationController,
)

router.use(authMiddleware(), authorize(RoleName.HR))

router.get('/', asyncWrapper(notificationController.list))
router.patch('/read-all', asyncWrapper(notificationController.markAllRead))

export default router
