import { Router } from 'express'
import { asyncWrapper } from '@/middlewares/async.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
import validate from '@/middlewares/validate-middleware'
import { container } from '@/inversify.config'
import { TYPES } from '@/types/di.types'
import { UserController } from '@/modules/user/controllers/user.controller'
import {
  CreateUserSchema,
  DeleteUserSchema,
  GetUserSchema,
  UpdateUserSchema,
} from '@/modules/user/validations/user.validation'

const router = Router()
const userController = container.get<UserController>(TYPES.UserController)

router.use(authMiddleware())

router.get('/', asyncWrapper(userController.list))
router.get(
  '/:userId',
  validate(GetUserSchema),
  asyncWrapper(userController.getById),
)
router.post(
  '/',
  validate(CreateUserSchema),
  asyncWrapper(userController.create),
)
router.put(
  '/:userId',
  validate(UpdateUserSchema),
  asyncWrapper(userController.update),
)
router.delete(
  '/:userId',
  validate(DeleteUserSchema),
  asyncWrapper(userController.delete),
)

export default router
