import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { BaseController } from '@/common/base.controller'
import { AssistantService } from '@/modules/assistant/services/assistant.service'
import { TYPES } from '@/types/di.types'

@injectable()
export class AssistantController extends BaseController {
  constructor(
    @inject(TYPES.AssistantService)
    private readonly assistantService: AssistantService,
  ) {
    super()
  }

  ask = async (req: Request, res: Response) => {
    const question = this.assistantService.ensureQuestion(
      req.body.question as string,
    )
    const result = await this.assistantService.ask(question)
    this.ok(res, result)
  }
}
