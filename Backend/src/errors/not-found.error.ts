import { ErrorInfo } from './error.types'
import { HttpCode } from '../utils/http.utils'
import BaseError from './base.error'

export default class NotFoundError extends BaseError {
  constructor(errorInfo?: ErrorInfo) {
    super(
      HttpCode.NOT_FOUND,
      errorInfo?.error || 'NOT_FOUND',
      errorInfo?.message || 'The requested resource could not be found.',
    )
  }
}
