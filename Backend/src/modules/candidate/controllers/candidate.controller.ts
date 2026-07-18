import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { BaseController } from '@/common/base.controller'
import ValidationError from '@/errors/validation.error'
import {
  ApplyCandidateDTO,
  AssignRecruiterDTO,
  CandidateListQueryDTO,
  ScheduleInterviewDTO,
  SendOfferDTO,
} from '@/modules/candidate/dtos/candidate.dto'
import { CandidateService } from '@/modules/candidate/services/candidate.service'
import { StoredUpload } from '@/modules/resume/services/resume.service'
import { TYPES } from '@/types/di.types'

@injectable()
export class CandidateController extends BaseController {
  constructor(
    @inject(TYPES.CandidateService)
    private readonly candidateService: CandidateService,
  ) {
    super()
  }

  apply = async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError([
        { field: 'resume', message: 'Resume file is required' },
      ])
    }

    const upload: StoredUpload = {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
    }

    const result = await this.candidateService.apply(
      req.body as ApplyCandidateDTO,
      upload,
    )
    this.created(res, result)
  }

  list = async (req: Request, res: Response) => {
    const result = await this.candidateService.list(
      req.query as unknown as CandidateListQueryDTO,
    )
    this.ok(res, result)
  }

  getDetails = async (req: Request, res: Response) => {
    const result = await this.candidateService.getDetails(
      req.params.candidateId as string,
    )
    this.ok(res, result)
  }

  addNote = async (req: Request, res: Response) => {
    const candidate = await this.candidateService.addNote(
      req.params.candidateId as string,
      req.userId as string,
      req.body.text as string,
    )
    this.ok(res, { candidate })
  }

  assignRecruiter = async (req: Request, res: Response) => {
    const candidate = await this.candidateService.assignRecruiter(
      req.params.candidateId as string,
      (req.body as AssignRecruiterDTO).recruiterId,
      req.userId as string,
    )
    this.ok(res, { candidate })
  }

  scheduleInterview = async (req: Request, res: Response) => {
    const candidate = await this.candidateService.scheduleInterview(
      req.params.candidateId as string,
      req.body as ScheduleInterviewDTO,
      req.userId as string,
    )
    this.ok(res, { candidate })
  }

  addInterviewFeedback = async (req: Request, res: Response) => {
    const candidate = await this.candidateService.addInterviewFeedback(
      req.params.candidateId as string,
      req.body.feedback as string,
      req.userId as string,
    )
    this.ok(res, { candidate })
  }

  sendOffer = async (req: Request, res: Response) => {
    const candidate = await this.candidateService.sendOffer(
      req.params.candidateId as string,
      req.body as SendOfferDTO,
      req.userId as string,
    )
    this.ok(res, { candidate })
  }

  markJoined = async (req: Request, res: Response) => {
    const candidate = await this.candidateService.markJoined(
      req.params.candidateId as string,
      req.userId as string,
    )
    this.ok(res, { candidate })
  }

  reject = async (req: Request, res: Response) => {
    const candidate = await this.candidateService.rejectByHr(
      req.params.candidateId as string,
      req.body.reason as string,
      req.userId as string,
    )
    this.ok(res, { candidate })
  }

  archive = async (req: Request, res: Response) => {
    const candidate = await this.candidateService.archive(
      req.params.candidateId as string,
      req.userId as string,
    )
    this.ok(res, { candidate })
  }

  delete = async (req: Request, res: Response) => {
    await this.candidateService.remove(
      req.params.candidateId as string,
      req.userId as string,
    )
    this.noContent(res)
  }

  export = async (req: Request, res: Response) => {
    const data = await this.candidateService.exportCandidate(
      req.params.candidateId as string,
    )
    this.ok(res, data)
  }
}
