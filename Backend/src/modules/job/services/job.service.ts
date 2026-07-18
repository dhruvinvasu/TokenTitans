import { inject, injectable } from 'inversify'
import { Config } from '@/config/app.config'
import NotFoundError from '@/errors/not-found.error'
import { CreateJobDTO, UpdateJobDTO } from '@/modules/job/dtos/job.dto'
import { IJob } from '@/modules/job/models/job.model'
import { JobRepository } from '@/modules/job/repositories/job.repository'
import { TYPES } from '@/types/di.types'

@injectable()
export class JobService {
  constructor(
    @inject(TYPES.JobRepository)
    private readonly jobRepository: JobRepository,
  ) {}

  async list() {
    return this.jobRepository.find({ deletedAt: null })
  }

  async listActive() {
    return this.jobRepository.findActive()
  }

  async getById(jobId: string): Promise<IJob> {
    const job = await this.jobRepository.findById(jobId)
    if (!job || job.deletedAt) {
      throw new NotFoundError({
        error: 'JOB_NOT_FOUND',
        message: 'Job not found.',
      })
    }
    return job as IJob
  }

  async create(data: CreateJobDTO, createdBy: string) {
    return this.jobRepository.create({
      title: data.title,
      role: data.role,
      description: data.description,
      requiredSkills: data.requiredSkills,
      experienceRequired: data.experienceRequired ?? 0,
      salaryRange: data.salaryRange,
      location: data.location,
      skillMatchThreshold:
        data.skillMatchThreshold ?? Config.SKILL_MATCH_THRESHOLD,
      salaryMatchThreshold:
        data.salaryMatchThreshold ?? Config.SALARY_MATCH_THRESHOLD,
      isActive: data.isActive ?? true,
      createdBy: createdBy as unknown as never,
    })
  }

  async update(jobId: string, data: UpdateJobDTO) {
    const job = await this.jobRepository.findByIdActive(jobId)
    if (!job) {
      throw new NotFoundError({
        error: 'JOB_NOT_FOUND',
        message: 'Job not found.',
      })
    }

    Object.assign(job, data)
    return job.save()
  }

  async delete(jobId: string) {
    const job = await this.jobRepository.findByIdActive(jobId)
    if (!job) {
      throw new NotFoundError({
        error: 'JOB_NOT_FOUND',
        message: 'Job not found.',
      })
    }

    job.deletedAt = new Date()
    await job.save()
  }
}
