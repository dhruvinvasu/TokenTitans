import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { BaseController } from '@/common/base.controller'
import {
  CreateUserDTO,
  UpdateUserDTO,
} from '@/modules/user/dtos/user.dto'
import { UserService } from '@/modules/user/services/user.service'
import { TYPES } from '@/types/di.types'

@injectable()
export class UserController extends BaseController {
  constructor(
    @inject(TYPES.UserService) private readonly userService: UserService,
  ) {
    super()
  }

  list = async (_req: Request, res: Response) => {
    const users = await this.userService.list()
    this.ok(res, { users })
  }

  getById = async (req: Request, res: Response) => {
    const user = await this.userService.getById(req.params.userId as string)
    this.ok(res, { user })
  }

  create = async (req: Request, res: Response) => {
    const user = await this.userService.create(req.body as CreateUserDTO)
    this.created(res, { user })
  }

  update = async (req: Request, res: Response) => {
    const user = await this.userService.update(
      req.params.userId as string,
      req.body as UpdateUserDTO,
    )
    this.ok(res, { user })
  }

  delete = async (req: Request, res: Response) => {
    await this.userService.delete(req.params.userId as string)
    this.noContent(res)
  }
}
