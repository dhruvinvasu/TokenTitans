import { Router } from 'express'
import { asyncWrapper } from '@/middlewares/async.middleware'
import validate from '@/middlewares/validate-middleware'
import { container } from '@/inversify.config'
import { TYPES } from '@/types/di.types'
import { AuthController } from '@/modules/auth/controllers/auth.controller'
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  VerifyOtpSchema,
} from '@/modules/auth/validations/auth.validation'

const router = Router()
const authController = container.get<AuthController>(TYPES.AuthController)

router.post(
  '/register',
  validate(RegisterSchema),
  asyncWrapper(authController.register),
)

router.post(
  '/verify-email',
  validate(VerifyOtpSchema),
  asyncWrapper(authController.verifyEmail),
)

router.post('/login', validate(LoginSchema), asyncWrapper(authController.login))

router.post(
  '/forgot-password',
  validate(ForgotPasswordSchema),
  asyncWrapper(authController.forgotPassword),
)

router.post(
  '/change-password',
  validate(ChangePasswordSchema),
  asyncWrapper(authController.changePassword),
)

export default router
