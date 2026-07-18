import {
  HydratedDocument,
  model,
  MongooseError,
  Schema,
  Types,
} from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { hashPassword } from '@/utils/crypto.utils'
import { BaseSchema, IBaseModel } from '@/models/base.model'

export interface IUser extends IBaseModel {
  _id: Types.ObjectId
  firstName: string
  lastName: string
  email: string
  password: string
  role: Types.ObjectId
  phoneNumber?: string
  isActive?: boolean
  isVerified?: boolean
  lastLogin?: Date
  profileImage?: string
  refreshToken?: string
  verificationOtp?: string
  verificationOtpExpiresAt?: Date
  resetPasswordOtp?: string
  resetPasswordOtpExpiresAt?: Date
}

const userSchema = new Schema<IUser>({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  password: { type: String, required: true, select: false },
  role: {
    type: Schema.Types.ObjectId,
    ref: modelNames.ROLE.modelName,
    required: true,
    index: true,
  },
  phoneNumber: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  profileImage: { type: String, trim: true },
  refreshToken: { type: String, select: false },
  verificationOtp: { type: String, select: false },
  verificationOtpExpiresAt: { type: Date },
  resetPasswordOtp: { type: String, select: false },
  resetPasswordOtpExpiresAt: { type: Date },
})

userSchema.add(BaseSchema)

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
)

userSchema.pre<IUser>('save', async function (next) {
  const user = this as HydratedDocument<IUser>
  if (!user.isModified('password')) return next()

  try {
    user.password = await hashPassword(user.password)
    next()
  } catch (error) {
    const mongooseError = new MongooseError(
      error instanceof Error ? error.message : 'Failed to create user data',
    )
    next(mongooseError)
  }
})

export const User = model<IUser>(
  modelNames.USER.modelName,
  userSchema,
  modelNames.USER.collectionName,
)
