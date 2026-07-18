import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { Config } from '@/config/app.config'
import { AUTH_ERRORS } from '@/constants/errors.constant'
import AuthenticationError from '@/errors/authentication.error'
import { TokenPayload } from '@/types/auth.types'
import { HttpCode } from '@/utils/http.utils'

export const authMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(' ')[1]
      if (!token) throw new AuthenticationError()

      const decoded = jwt.verify(token, Config.JWT_SECRET) as TokenPayload
      req.userId = decoded.userId
      req.userEmail = decoded.email
      req.userRole = decoded.role

      next()
    } catch {
      res.status(HttpCode.UNAUTHORIZED).json(AUTH_ERRORS.UNAUTHORIZED)
    }
  }
}
