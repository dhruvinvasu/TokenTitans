export default class BaseError extends Error {
  readonly status: number
  readonly error: string

  constructor(status: number, error: string, message = 'An error occurred') {
    super(message)
    this.status = status
    this.error = error
    Error.captureStackTrace(this, this.constructor)
  }

  toJson() {
    return { error: this.error, message: this.message }
  }
}
