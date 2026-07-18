import { inject, injectable } from 'inversify'
import nodemailer, { Transporter } from 'nodemailer'
import { Config } from '@/config/app.config'
import { EmailStatus } from '@/modules/email/models/email-log.model'
import { EmailLogRepository } from '@/modules/email/repositories/email-log.repository'
import { TYPES } from '@/types/di.types'
import { logger } from '@/utils/logger.util'

export interface SendMailInput {
  candidateId?: string
  to: string
  subject: string
  template: string
  html: string
  text?: string
  expiresAt?: Date
  meta?: Record<string, unknown>
}

/**
 * SMTP mail delivery via Nodemailer. Every send is persisted to `email_logs`
 * with its delivery status so the HR dashboard can report on email health.
 */
@injectable()
export class MailService {
  private readonly transporter: Transporter | null

  constructor(
    @inject(TYPES.EmailLogRepository)
    private readonly emailLogRepository: EmailLogRepository,
  ) {
    this.transporter = Config.SMTP_HOST
      ? nodemailer.createTransport({
          host: Config.SMTP_HOST,
          port: Config.SMTP_PORT,
          secure: Config.SMTP_SECURE,
          auth:
            Config.SMTP_USER && Config.SMTP_PASSWORD
              ? { user: Config.SMTP_USER, pass: Config.SMTP_PASSWORD }
              : undefined,
        })
      : null

    if (!this.transporter) {
      logger.warn(
        'SMTP is not configured — outgoing emails will be logged as FAILED.',
      )
    }
  }

  async send(input: SendMailInput) {
    const emailLog = await this.emailLogRepository.create({
      candidate: input.candidateId
        ? (input.candidateId as unknown as never)
        : undefined,
      to: input.to,
      subject: input.subject,
      template: input.template,
      status: EmailStatus.PENDING,
      expiresAt: input.expiresAt,
      meta: input.meta,
    })

    if (!this.transporter) {
      await this.emailLogRepository.updateById(emailLog._id.toString(), {
        status: EmailStatus.FAILED,
        error: 'SMTP transport not configured',
      })
      return { success: false, emailLogId: emailLog._id.toString() }
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${Config.MAIL_FROM_NAME}" <${Config.MAIL_FROM_EMAIL}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      })

      await this.emailLogRepository.updateById(emailLog._id.toString(), {
        status: EmailStatus.SENT,
        providerMessageId: info.messageId,
        sentAt: new Date(),
      })

      return { success: true, emailLogId: emailLog._id.toString() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to send email to ${input.to}: ${message}`)

      await this.emailLogRepository.updateById(emailLog._id.toString(), {
        status: EmailStatus.FAILED,
        error: message,
      })

      return { success: false, emailLogId: emailLog._id.toString() }
    }
  }
}
