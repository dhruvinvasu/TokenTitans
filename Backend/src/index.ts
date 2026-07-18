import dotenv from 'dotenv'
dotenv.config()

import 'reflect-metadata'
import cors from 'cors'
import express, { Request, Response } from 'express'
import helmet from 'helmet'
import { Config } from './config/app.config'
import { connectDB } from './config/database'
import { setupGlobalErrorHandlers } from './config/global-error-handler'
import errorRequestHandler from './middlewares/error-handler.middleware'
import { seedDefaultRoles } from './modules/role/seeds/role.seed'
import router from './routes/router'
import { logger } from './utils/logger.util'

setupGlobalErrorHandlers()

const startServer = async () => {
  try {
    await connectDB()
    await seedDefaultRoles()

    const app = express()

    app.use(cors())
    app.use(helmet())
    app.use(
      express.json({
        limit: '500kb',
        verify: (req: Request, _res: Response, buf: Buffer) => {
          req.rawBody = buf
        },
      }),
    )

    app.use(router)
    app.use(errorRequestHandler)

    app.listen(Config.PORT, () => {
      logger.info(`Server running at http://localhost:${Config.PORT}`)
    })
  } catch (err) {
    const error = err as Error
    logger.error(`Failed to start the application: ${error.message}`, {
      stack: error.stack,
    })
    process.exit(1)
  }
}

startServer()
