import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import ValidationError from '../errors/validation.error'
import { RequestValidationSchema } from '../validation'

const validate = (schema: RequestValidationSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.parsedBody = req.body
      if (schema.body) req.body = await schema.body.parseAsync(req.body)
      if (schema.params) req.params = await schema.params.parseAsync(req.params)
      if (schema.query) req.query = await schema.query.parseAsync(req.query)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          message: err.message,
          field: err.path.join('.'),
        }))
        return next(new ValidationError(validationErrors))
      }
      return next(error)
    }
  }
}

export default validate
