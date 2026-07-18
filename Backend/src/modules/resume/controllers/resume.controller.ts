import { existsSync } from 'fs'
import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { BaseController } from '@/common/base.controller'
import NotFoundError from '@/errors/not-found.error'
import { ResumeService } from '@/modules/resume/services/resume.service'
import { TYPES } from '@/types/di.types'

@injectable()
export class ResumeController extends BaseController {
  constructor(
    @inject(TYPES.ResumeService)
    private readonly resumeService: ResumeService,
  ) {
    super()
  }

  getByCandidate = async (req: Request, res: Response) => {
    const resume = await this.resumeService.getByCandidate(
      req.params.candidateId as string,
    )
    this.ok(res, { resume })
  }

  download = async (req: Request, res: Response) => {
    const resume = await this.resumeService.getByCandidate(
      req.params.candidateId as string,
    )
    if (!existsSync(resume.path)) {
      throw new NotFoundError({
        error: 'RESUME_FILE_NOT_FOUND',
        message: 'Resume file is no longer available on disk.',
      })
    }
    res.download(resume.path, resume.originalName)
  }
}
