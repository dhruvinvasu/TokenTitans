import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { BaseController } from '@/common/base.controller'
import { NotificationService } from '@/modules/notification/services/notification.service'
import { TYPES } from '@/types/di.types'

@injectable()
export class NotificationController extends BaseController {
  constructor(
    @inject(TYPES.NotificationService)
    private readonly notificationService: NotificationService,
  ) {
    super()
  }

  list = async (_req: Request, res: Response) => {
    const [notifications, unread] = await Promise.all([
      this.notificationService.listRecent(),
      this.notificationService.countUnread(),
    ])
    this.ok(res, { notifications, unread })
  }

  markAllRead = async (_req: Request, res: Response) => {
    await this.notificationService.markAllRead()
    this.ok(res, { success: true })
  }
}
