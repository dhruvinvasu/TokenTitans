import { Router, Request, Response } from 'express'
import { HttpCode } from '@/utils/http.utils'
import v1Routes from './v1/v1Router'

const router = Router()

router.get('/health', (_req: Request, res: Response) => {
  res.status(HttpCode.OK).json({ status: 'UP', timestamp: new Date() })
})

router.use('/v1', v1Routes)

router.all('*', (_req: Request, res: Response) => {
  res.status(HttpCode.NOT_FOUND).json({ error: 'Route_Not_Found' })
})

export default router
