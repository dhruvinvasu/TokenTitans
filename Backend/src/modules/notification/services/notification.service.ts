import { inject, injectable } from 'inversify'
import { NotificationType } from '@/modules/notification/models/notification.model'
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository'
import { TYPES } from '@/types/di.types'
import { logger } from '@/utils/logger.util'

export interface CreateNotificationInput {
  type: NotificationType
  title: string
  message: string
  candidateId?: string
  meta?: Record<string, unknown>
}

@injectable()
export class NotificationService {
  constructor(
    @inject(TYPES.NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async notify(input: CreateNotificationInput) {
    try {
      await this.notificationRepository.create({
        type: input.type,
        title: input.title,
        message: input.message,
        candidate: input.candidateId
          ? (input.candidateId as unknown as never)
          : undefined,
        read: false,
        meta: input.meta,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to create notification: ${message}`)
    }
  }

  async listRecent(limit?: number) {
    return this.notificationRepository.listRecent(limit)
  }

  async countUnread() {
    return this.notificationRepository.countUnread()
  }

  async markAllRead() {
    await this.notificationRepository.markAllRead()
  }
}
