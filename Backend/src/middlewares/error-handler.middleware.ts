import { ErrorRequestHandler, NextFunction, Request, Response } from 'express'
import { Config } from '../config/app.config'
import { Env } from '../config/config.types'
import { SERVER_ERRORS } from '../constants/errors.constant'
import BaseError from '../errors/base.error'
import { sanitizeBody, sanitizeHeaders } from '../utils/http.utils'
import { logger } from '../utils/logger.util'

const errorRequestHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    res.status(400).json({
      error: 'INVALID_JSON',
      message: 'Invalid JSON payload',
      ...(Config.NODE_ENV !== Env.PROD && { details: err.message }),
    })
    return
  }

  const statusCode = err instanceof BaseError ? err.status : 500
  res.status(statusCode)

  const message = `${req.method} ${req.url} | ${statusCode} | ${err.message}`
  const infos = {
    stack: err.stack,
    requestBody: sanitizeBody(req.parsedBody as Record<string, unknown>),
    requestHeaders: sanitizeHeaders(req.headers),
    requestMethod: req.method,
    requestEndpoint: req.url,
  }

  if (statusCode >= 500) logger.error(message, infos)
  else if (statusCode >= 400) logger.warn(message, infos)

  if (err instanceof BaseError && statusCode < 500) {
    res.json(err.toJson())
    return
  }

  res.json({
    ...SERVER_ERRORS.INTERNAL_SERVER_ERROR,
    ...(Config.NODE_ENV !== Env.PROD && { stack: err.stack }),
  })
}

export default errorRequestHandler
