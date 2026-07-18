import { injectable } from 'inversify'
import { IResume, Resume } from '@/modules/resume/models/resume.model'
import { IRepository } from '@/repositories/base.repository'

@injectable()
export class ResumeRepository extends IRepository<IResume> {
  constructor() {
    super(Resume)
  }

  async findByCandidate(candidateId: string) {
    return this.model.findOne({ candidate: candidateId, deletedAt: null })
  }

  async findDocumentById(id: string) {
    return this.model.findOne({ _id: id, deletedAt: null })
  }
}
