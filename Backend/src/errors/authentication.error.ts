import { ErrorInfo } from './error.types'
import { HttpCode } from '../utils/http.utils'
import BaseError from './base.error'

export default class AuthenticationError extends BaseError {
  constructor(errorInfo?: ErrorInfo) {
    super(
      HttpCode.UNAUTHORIZED,
      errorInfo?.error || 'AUTHENTICATION_FAILED',
      errorInfo?.message || 'Authentication failed.',
    )
  }
}
