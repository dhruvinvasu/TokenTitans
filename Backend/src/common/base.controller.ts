import { Response } from 'express'
import { HttpCode } from '@/utils/http.utils'

export class BaseController {
  protected ok<T>(res: Response, data: T = {} as T) {
    return res.status(HttpCode.OK).json(data)
  }

  protected created<T>(res: Response, data: T = {} as T) {
    return res.status(HttpCode.CREATED).json(data)
  }

  protected noContent(res: Response) {
    return res.status(HttpCode.NO_CONTENT).send()
  }
}
