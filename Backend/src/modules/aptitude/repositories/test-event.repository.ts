import { injectable } from 'inversify'
import {
  ITestEvent,
  TestEvent,
  TestEventCategory,
} from '@/modules/aptitude/models/test-event.model'
import { IRepository } from '@/repositories/base.repository'

export interface RawTestEvent {
  test: string
  candidate: string
  category: TestEventCategory
  type: string
  weight: number
  occurredAt: Date
  meta?: Record<string, unknown>
}

@injectable()
export class TestEventRepository extends IRepository<ITestEvent> {
  constructor() {
    super(TestEvent)
  }

  async insertBatch(events: RawTestEvent[]) {
    if (events.length === 0) return []
    return this.model.insertMany(events)
  }

  async findByTest(testId: string) {
    return this.model
      .find({ test: testId, deletedAt: null })
      .sort({ occurredAt: 1 })
      .lean()
  }

  async findViolationsByTest(testId: string) {
    return this.model
      .find({
        test: testId,
        category: TestEventCategory.VIOLATION,
        deletedAt: null,
      })
      .sort({ occurredAt: 1 })
      .lean()
  }
}
