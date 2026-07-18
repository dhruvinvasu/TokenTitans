import mongoose from 'mongoose'
import { Config } from './app.config'
import { logger } from '../utils/logger.util'

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(Config.DATABASE_URI)
    logger.info('Connected to MongoDB')
  } catch (error) {
    logger.error('Database connection failed:', error)
    process.exit(1)
  }
}
