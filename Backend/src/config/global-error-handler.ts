import { logger } from '../utils/logger.util'
import { Config } from './app.config'
import { Env } from './config.types'

export const setupGlobalErrorHandlers = () => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('UNCAUGHT EXCEPTION', {
      error: error.message,
      stack: error.stack,
    })
  })

  process.on('unhandledRejection', (reason: unknown) => {
    const errorInfo =
      reason instanceof Error
        ? { message: reason.message, stack: reason.stack }
        : { message: String(reason) }

    logger.error('UNHANDLED PROMISE REJECTION', errorInfo)
  })

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Graceful shutdown initiated...')
    performGracefulShutdown()
  })

  process.on('SIGINT', () => {
    logger.info('SIGINT received. Graceful shutdown initiated...')
    performGracefulShutdown()
  })
}

async function performGracefulShutdown() {
  const delay = Config.NODE_ENV === Env.DEV ? 100 : 2000
  await new Promise((resolve) => setTimeout(resolve, delay))
  process.exit(0)
}
