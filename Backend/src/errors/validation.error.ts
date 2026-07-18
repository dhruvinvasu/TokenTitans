import { ValidationErrorDetail } from '@/validation'
import { HttpCode } from '../utils/http.utils'
import BaseError from './base.error'

export default class ValidationError extends BaseError {
  public validationErrors: ValidationErrorDetail[]

  constructor(errors: ValidationErrorDetail[]) {
    super(
      HttpCode.BAD_REQUEST,
      'VALIDATION_ERROR',
      'The request has validation errors.',
    )
    this.validationErrors = errors
  }

  toJson() {
    return {
      error: this.error,
      message: this.message,
      validationErrors: this.validationErrors,
    }
  }
}
