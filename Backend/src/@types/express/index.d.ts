import 'express'

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer
      parsedBody?: Record<string, unknown>
      userId?: string
      userEmail?: string
      userRole?: string
    }
  }
}

export {}
