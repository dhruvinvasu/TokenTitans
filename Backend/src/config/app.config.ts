import { z } from 'zod'
import { logger } from '../utils/logger.util'
import { Env } from './config.types'

const envSchema = z.object({
  NODE_ENV: z.nativeEnum(Env),
  PORT: z.coerce.number().positive().default(3001),
  TZ: z.string().refine((value) => value === 'UTC'),
  DATABASE_URI: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
  SALT_ROUNDS: z.coerce.number().positive().min(10).max(15).default(12),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().positive(),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  EMAIL_FROM: z.string(),
})

export const parseEnv = (): z.infer<typeof envSchema> => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(
        `Invalid Env error => ${error.errors.map((e) => `${e.path}: ${e.message}`).join(', ')}`,
      )
    }
    process.exit(1)
  }
}

export const Config = parseEnv()
