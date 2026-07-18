import { inject, injectable } from 'inversify'
import { sign, SignOptions } from 'jsonwebtoken'
import { Config } from '@/config/app.config'
import AuthenticationError from '@/errors/authentication.error'
import ConflictError from '@/errors/conflict.error'
import ForbiddenError from '@/errors/forbidden.error'
import NotFoundError from '@/errors/not-found.error'
import ValidationError from '@/errors/validation.error'
import {
  OTP_EXPIRY_MINUTES,
  OTP_LENGTH,
} from '@/modules/auth/constants/auth.constants'
import {
  ChangePasswordDTO,
  ForgotPasswordDTO,
  LoginDTO,
  RegisterDTO,
  VerifyOtpDTO,
} from '@/modules/auth/dtos/auth.dto'
import { EmailService } from '@/modules/auth/services/email.service'
import { RoleService } from '@/modules/role/services/role.service'
import { UserRepository } from '@/modules/user/repositories/user.repository'
import { TYPES } from '@/types/di.types'
import { TokenPayload } from '@/types/auth.types'
import { comparePasswords, generateOtp } from '@/utils/crypto.utils'

@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.UserRepository)
    private readonly userRepository: UserRepository,
    @inject(TYPES.RoleService)
    private readonly roleService: RoleService,
    @inject(TYPES.EmailService)
    private readonly emailService: EmailService,
  ) {}

  async register(data: RegisterDTO) {
    const existingUser = await this.userRepository.findOne({
      email: data.email,
      deletedAt: null,
    })
    if (existingUser) {
      throw new ConflictError({
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'A user with this email already exists.',
      })
    }

    const role = await this.roleService.resolveRole(data.role)

    const { otp, expiresAt } = this.generateOtpWithExpiry()

    const user = await this.userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      phoneNumber: data.phoneNumber,
      role: role._id,
      verificationOtp: otp,
      verificationOtpExpiresAt: expiresAt,
    })

    await this.emailService.sendVerificationOtp(user.email, otp)

    return {
      message:
        'Registration successful. Please verify your email using the OTP sent to your inbox.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: role.name,
      },
    }
  }

  async verifyEmail(data: VerifyOtpDTO) {
    const user = await this.userRepository.findByEmailWithVerificationOtp(
      data.email,
    )
    if (!user || user.deletedAt) {
      throw new NotFoundError({
        error: 'USER_NOT_FOUND',
        message: 'User not found.',
      })
    }

    if (user.isVerified) {
      throw new ConflictError({
        error: 'EMAIL_ALREADY_VERIFIED',
        message: 'Email is already verified.',
      })
    }

    if (
      !this.isOtpValid(
        user.verificationOtp,
        user.verificationOtpExpiresAt,
        data.otp,
      )
    ) {
      throw new ValidationError([
        { field: 'otp', message: 'Invalid or expired OTP.' },
      ])
    }

    await this.userRepository.updateById(user._id.toString(), {
      isVerified: true,
      $unset: { verificationOtp: 1, verificationOtpExpiresAt: 1 },
    })

    return { message: 'Email verified successfully. You can now log in.' }
  }

  async login(data: LoginDTO) {
    const user = await this.userRepository.findByEmail(data.email)
    if (!user || user.deletedAt) throw new AuthenticationError()

    const isMatch = await comparePasswords(data.password, user.password)
    if (!isMatch) throw new AuthenticationError()

    if (!user.isVerified) {
      throw new ForbiddenError({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in.',
      })
    }

    if (user.isActive === false) {
      throw new ForbiddenError({
        error: 'ACCOUNT_INACTIVE',
        message: 'Your account is inactive. Please contact support.',
      })
    }

    const roleName = user.role?.name

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: roleName,
    }

    const signOptions: SignOptions = {
      expiresIn: Config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    }
    const token = sign(tokenPayload, Config.JWT_SECRET, signOptions)

    await this.userRepository.updateById(user._id.toString(), {
      lastLogin: new Date(),
    })

    return {
      token,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: roleName,
      },
    }
  }

  async forgotPassword(data: ForgotPasswordDTO) {
    const genericResponse = {
      message:
        'If an account with that email exists, a password reset OTP has been sent.',
    }

    const user = await this.userRepository.findOne({
      email: data.email,
      deletedAt: null,
    })
    if (!user) return genericResponse

    const { otp, expiresAt } = this.generateOtpWithExpiry()

    await this.userRepository.updateById(user._id.toString(), {
      resetPasswordOtp: otp,
      resetPasswordOtpExpiresAt: expiresAt,
    })

    await this.emailService.sendPasswordResetOtp(user.email, otp)

    return genericResponse
  }

  async changePassword(data: ChangePasswordDTO) {
    const user = await this.userRepository.findByEmailWithResetOtp(data.email)
    if (
      !user ||
      user.deletedAt ||
      !this.isOtpValid(
        user.resetPasswordOtp,
        user.resetPasswordOtpExpiresAt,
        data.otp,
      )
    ) {
      throw new ValidationError([
        { field: 'otp', message: 'Invalid or expired OTP.' },
      ])
    }

    user.password = data.newPassword
    user.resetPasswordOtp = undefined
    user.resetPasswordOtpExpiresAt = undefined
    await user.save()

    return {
      message:
        'Password has been reset successfully. You can now log in with your new password.',
    }
  }

  private generateOtpWithExpiry(): { otp: string; expiresAt: Date } {
    const otp = generateOtp(OTP_LENGTH)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    return { otp, expiresAt }
  }

  private isOtpValid(
    storedOtp: string | undefined,
    expiresAt: Date | undefined,
    providedOtp: string,
  ): boolean {
    if (!storedOtp || !expiresAt) return false
    if (storedOtp !== providedOtp) return false
    return expiresAt.getTime() >= Date.now()
  }
}
