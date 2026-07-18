import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { BaseController } from '@/common/base.controller'
import { DashboardService } from '@/modules/dashboard/services/dashboard.service'
import { TYPES } from '@/types/di.types'

@injectable()
export class DashboardController extends BaseController {
  constructor(
    @inject(TYPES.DashboardService)
    private readonly dashboardService: DashboardService,
  ) {
    super()
  }

  overview = async (_req: Request, res: Response) => {
    const overview = await this.dashboardService.overview()
    this.ok(res, overview)
  }
}
