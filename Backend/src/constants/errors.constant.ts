const ERRORS = {
  AUTH_ERRORS: {
    UNAUTHORIZED: {
      error: 'AUTHENTICATION_FAILED',
      message: 'Authentication failed',
    },
  },
  SERVER_ERRORS: {
    INTERNAL_SERVER_ERROR: {
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred on the server.',
    },
  },
}

export const { AUTH_ERRORS, SERVER_ERRORS } = ERRORS
