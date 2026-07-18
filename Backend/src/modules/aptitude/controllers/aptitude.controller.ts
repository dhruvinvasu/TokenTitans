import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { BaseController } from '@/common/base.controller'
import {
  IncomingTestEvent,
  SubmitAnswer,
} from '@/modules/aptitude/services/aptitude.service'
import { AptitudeService } from '@/modules/aptitude/services/aptitude.service'
import { TYPES } from '@/types/di.types'

@injectable()
export class AptitudeController extends BaseController {
  constructor(
    @inject(TYPES.AptitudeService)
    private readonly aptitudeService: AptitudeService,
  ) {
    super()
  }

  // Candidate-facing (token authenticated).
  getForCandidate = async (req: Request, res: Response) => {
    const test = await this.aptitudeService.getForCandidate(
      req.params.token as string,
    )
    this.ok(res, { test })
  }

  start = async (req: Request, res: Response) => {
    const test = await this.aptitudeService.startTest(req.params.token as string)
    this.ok(res, { test })
  }

  recordEvents = async (req: Request, res: Response) => {
    const snapshot = await this.aptitudeService.recordEvents(
      req.params.token as string,
      req.body.events as IncomingTestEvent[],
    )
    this.ok(res, snapshot)
  }

  submit = async (req: Request, res: Response) => {
    const result = await this.aptitudeService.submitTest(
      req.params.token as string,
      req.body.answers as SubmitAnswer[],
      Boolean(req.body.autoSubmitted),
    )
    this.ok(res, { result })
  }

  // HR-facing.
  report = async (req: Request, res: Response) => {
    const report = await this.aptitudeService.getReport(
      req.params.candidateId as string,
    )
    this.ok(res, report)
  }

  reset = async (req: Request, res: Response) => {
    const test = await this.aptitudeService.resetTest(
      req.params.candidateId as string,
    )
    this.ok(res, { test })
  }

  extend = async (req: Request, res: Response) => {
    const test = await this.aptitudeService.extendTest(
      req.params.candidateId as string,
      req.body.days as number,
    )
    this.ok(res, { test })
  }
}
