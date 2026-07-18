import { Router } from 'express'
import { asyncWrapper } from '@/middlewares/async.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { authorize } from '@/middlewares/authorize.middleware'
import { container } from '@/inversify.config'
import { DashboardController } from '@/modules/dashboard/controllers/dashboard.controller'
import { RoleName } from '@/modules/role/constants/role.constants'
import { TYPES } from '@/types/di.types'

const router = Router()
const dashboardController = container.get<DashboardController>(
  TYPES.DashboardController,
)

router.use(authMiddleware(), authorize(RoleName.HR))

router.get('/overview', asyncWrapper(dashboardController.overview))

export default router
