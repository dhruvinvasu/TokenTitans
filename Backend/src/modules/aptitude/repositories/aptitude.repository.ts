import { injectable } from 'inversify'
import { FilterQuery, PipelineStage } from 'mongoose'
import {
  AptitudeTest,
  IAptitudeTest,
} from '@/modules/aptitude/models/aptitude-test.model'
import { IRepository } from '@/repositories/base.repository'

@injectable()
export class AptitudeRepository extends IRepository<IAptitudeTest> {
  constructor() {
    super(AptitudeTest)
  }

  /** Loads the test by its secure token including the hidden correct answers. */
  async findByTokenWithAnswers(token: string) {
    return this.model
      .findOne({ token, deletedAt: null })
      .select('+questions.correctIndex')
  }

  async findByToken(token: string) {
    return this.model.findOne({ token, deletedAt: null })
  }

  async findByCandidate(candidateId: string) {
    return this.model
      .findOne({ candidate: candidateId, deletedAt: null })
      .sort({ createdAt: -1 })
  }

  async countBy(filter: FilterQuery<IAptitudeTest>) {
    return this.model.countDocuments({ ...filter, deletedAt: null })
  }

  async aggregate<T>(pipeline: PipelineStage[]): Promise<T[]> {
    return this.model.aggregate<T>(pipeline)
  }
}
