import { inject, injectable } from 'inversify'
import {
  TimelineActor,
} from '@/modules/timeline/models/candidate-timeline.model'
import { TimelineRepository } from '@/modules/timeline/repositories/timeline.repository'
import { TYPES } from '@/types/di.types'

export interface RecordTimelineInput {
  candidateId: string
  event: string
  message: string
  fromStatus?: string
  toStatus?: string
  actorType?: TimelineActor
  actor?: string
  meta?: Record<string, unknown>
}

@injectable()
export class TimelineService {
  constructor(
    @inject(TYPES.TimelineRepository)
    private readonly timelineRepository: TimelineRepository,
  ) {}

  async record(input: RecordTimelineInput) {
    return this.timelineRepository.create({
      candidate: input.candidateId as unknown as never,
      event: input.event,
      message: input.message,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorType: input.actorType ?? TimelineActor.SYSTEM,
      actor: input.actor ? (input.actor as unknown as never) : undefined,
      meta: input.meta,
    })
  }

  async listForCandidate(candidateId: string) {
    return this.timelineRepository.findByCandidate(candidateId)
  }
}
