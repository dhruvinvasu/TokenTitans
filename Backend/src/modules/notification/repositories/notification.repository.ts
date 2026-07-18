import { injectable } from 'inversify'
import {
  INotification,
  Notification,
} from '@/modules/notification/models/notification.model'
import { IRepository } from '@/repositories/base.repository'

@injectable()
export class NotificationRepository extends IRepository<INotification> {
  constructor() {
    super(Notification)
  }

  async listRecent(limit = 20) {
    return this.model
      .find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  }

  async markAllRead() {
    return this.model.updateMany(
      { read: false, deletedAt: null },
      { read: true },
    )
  }

  async countUnread() {
    return this.model.countDocuments({ read: false, deletedAt: null })
  }
}
