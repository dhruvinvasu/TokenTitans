import { ErrorInfo } from './error.types'
import { HttpCode } from '../utils/http.utils'
import BaseError from './base.error'

export default class ConflictError extends BaseError {
  constructor(errorInfo?: ErrorInfo) {
    super(
      HttpCode.CONFLICT,
      errorInfo?.error || 'CONFLICT_ERROR',
      errorInfo?.message || 'A conflict occurred.',
    )
  }
}
