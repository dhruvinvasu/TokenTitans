import { NextFunction, Request, Response } from 'express'
import ForbiddenError from '@/errors/forbidden.error'
import { RoleName } from '@/modules/role/constants/role.constants'

/**
 * Role-based authorization guard. Must run after `authMiddleware()`, which
 * populates `req.userRole` from the verified JWT.
 */
export const authorize = (...allowedRoles: RoleName[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.userRole
    if (!role || !allowedRoles.includes(role as RoleName)) {
      throw new ForbiddenError({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to access this resource.',
      })
    }
    next()
  }
}
