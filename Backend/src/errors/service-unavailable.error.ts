import { ErrorInfo } from './error.types'
import { HttpCode } from '../utils/http.utils'
import BaseError from './base.error'

export default class ServiceUnavailableError extends BaseError {
  constructor(errorInfo?: ErrorInfo) {
    super(
      HttpCode.SERVICE_UNAVAILABLE,
      errorInfo?.error || 'SERVICE_UNAVAILABLE',
      errorInfo?.message ||
        'The service is temporarily unavailable. Please try again later.',
    )
  }
}
