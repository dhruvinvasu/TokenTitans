import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { BaseController } from '@/common/base.controller'
import { CreateJobDTO, UpdateJobDTO } from '@/modules/job/dtos/job.dto'
import { JobService } from '@/modules/job/services/job.service'
import { TYPES } from '@/types/di.types'

@injectable()
export class JobController extends BaseController {
  constructor(
    @inject(TYPES.JobService) private readonly jobService: JobService,
  ) {
    super()
  }

  list = async (_req: Request, res: Response) => {
    const jobs = await this.jobService.list()
    this.ok(res, { jobs })
  }

  listActive = async (_req: Request, res: Response) => {
    const jobs = await this.jobService.listActive()
    this.ok(res, { jobs })
  }

  getById = async (req: Request, res: Response) => {
    const job = await this.jobService.getById(req.params.jobId as string)
    this.ok(res, { job })
  }

  create = async (req: Request, res: Response) => {
    const job = await this.jobService.create(
      req.body as CreateJobDTO,
      req.userId as string,
    )
    this.created(res, { job })
  }

  update = async (req: Request, res: Response) => {
    const job = await this.jobService.update(
      req.params.jobId as string,
      req.body as UpdateJobDTO,
    )
    this.ok(res, { job })
  }

  delete = async (req: Request, res: Response) => {
    await this.jobService.delete(req.params.jobId as string)
    this.noContent(res)
  }
}
