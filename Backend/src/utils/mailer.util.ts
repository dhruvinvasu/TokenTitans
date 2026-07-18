import nodemailer, { Transporter } from 'nodemailer'
import { Config } from '@/config/app.config'
import { logger } from '@/utils/logger.util'

export interface SendMailOptions {
  to: string
  subject: string
  html: string
}

let transporter: Transporter | null = null

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: Config.SMTP_HOST,
      port: Config.SMTP_PORT,
      secure: Config.SMTP_PORT === 465,
      auth: {
        user: Config.SMTP_USER,
        pass: Config.SMTP_PASSWORD,
      },
    })
  }

  return transporter
}

export const sendMail = async ({
  to,
  subject,
  html,
}: SendMailOptions): Promise<void> => {
  try {
    await getTransporter().sendMail({
      from: Config.EMAIL_FROM,
      to,
      subject,
      html,
    })
  } catch (error) {
    logger.error(`Failed to send email to ${to}`, {
      subject,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
