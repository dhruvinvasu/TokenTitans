import { injectable } from 'inversify'
import { OTP_EXPIRY_MINUTES } from '@/modules/auth/constants/auth.constants'
import { sendMail } from '@/utils/mailer.util'

interface OtpEmailContent {
  heading: string
  intro: string
  otp: string
}

@injectable()
export class EmailService {
  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    await sendMail({
      to: email,
      subject: 'Verify your email address',
      html: this.buildOtpEmail({
        heading: 'Verify your email',
        intro:
          'Use the one-time password (OTP) below to verify your email address and activate your account.',
        otp,
      }),
    })
  }

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    await sendMail({
      to: email,
      subject: 'Reset your password',
      html: this.buildOtpEmail({
        heading: 'Reset your password',
        intro:
          'Use the one-time password (OTP) below to reset your password. If you did not request this, you can safely ignore this email.',
        otp,
      }),
    })
  }

  private buildOtpEmail({ heading, intro, otp }: OtpEmailContent): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h2 style="margin-bottom: 16px;">${heading}</h2>
        <p style="margin-bottom: 24px; line-height: 1.5;">${intro}</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; margin: 0 0 24px;">${otp}</p>
        <p style="color: #666; font-size: 14px;">This OTP will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
      </div>
    `
  }
}
