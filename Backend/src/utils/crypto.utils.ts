import bcrypt from 'bcrypt'
import { randomInt } from 'crypto'
import { Config } from '@/config/app.config'

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, Config.SALT_ROUNDS)
}

export const comparePasswords = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword)
}

export const generateOtp = (length: number): string => {
  const min = 10 ** (length - 1)
  const max = 10 ** length
  return randomInt(min, max).toString()
}
