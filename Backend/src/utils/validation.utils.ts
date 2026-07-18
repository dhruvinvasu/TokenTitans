import { isValidObjectId } from 'mongoose'

export const isValidMongoId = (value: string): boolean =>
  typeof value === 'string' && isValidObjectId(value)
