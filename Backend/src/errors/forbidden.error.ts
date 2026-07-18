import { ErrorInfo } from './error.types'
import { HttpCode } from '../utils/http.utils'
import BaseError from './base.error'

export default class ForbiddenError extends BaseError {
  constructor(errorInfo?: ErrorInfo) {
    super(
      HttpCode.FORBIDDEN,
      errorInfo?.error || 'FORBIDDEN',
      errorInfo?.message ||
        'You do not have permission to perform this action.',
    )
  }
}
