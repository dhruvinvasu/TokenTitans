export enum HttpCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export function sanitizeBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const keysToRemove = ['password']
  const sanitizedBody = { ...body }
  keysToRemove.forEach((key) => {
    if (sanitizedBody[key]) sanitizedBody[key] = '[REDACTED]'
  })
  return sanitizedBody
}

export function sanitizeHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  const keysToRemove = ['authorization', 'cookie', 'x-auth-token']
  const sanitizedHeaders = { ...headers }
  keysToRemove.forEach((key) => {
    if (sanitizedHeaders[key]) sanitizedHeaders[key] = '[REDACTED]'
  })
  return sanitizedHeaders
}
