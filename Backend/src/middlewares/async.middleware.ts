import { Request, Response, NextFunction } from 'express'

export const asyncWrapper =
  <TReq extends Request = Request>(
    fn: (req: TReq, res: Response, next: NextFunction) => Promise<void>,
  ) =>
  (req: TReq, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next)
