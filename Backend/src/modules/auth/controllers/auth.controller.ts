import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { BaseController } from '@/common/base.controller'
import {
  ChangePasswordDTO,
  ForgotPasswordDTO,
  LoginDTO,
  RegisterDTO,
  VerifyOtpDTO,
} from '@/modules/auth/dtos/auth.dto'
import { AuthService } from '@/modules/auth/services/auth.service'
import { TYPES } from '@/types/di.types'

@injectable()
export class AuthController extends BaseController {
  constructor(
    @inject(TYPES.AuthService) private readonly authService: AuthService,
  ) {
    super()
  }

  register = async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body as RegisterDTO)
    this.created(res, result)
  }

  verifyEmail = async (req: Request, res: Response) => {
    const result = await this.authService.verifyEmail(req.body as VerifyOtpDTO)
    this.ok(res, result)
  }

  login = async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body as LoginDTO)
    this.ok(res, result)
  }

  forgotPassword = async (req: Request, res: Response) => {
    const result = await this.authService.forgotPassword(
      req.body as ForgotPasswordDTO,
    )
    this.ok(res, result)
  }

  changePassword = async (req: Request, res: Response) => {
    const result = await this.authService.changePassword(
      req.body as ChangePasswordDTO,
    )
    this.ok(res, result)
  }
}
