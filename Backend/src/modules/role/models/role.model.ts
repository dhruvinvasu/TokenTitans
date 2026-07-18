import { model, Schema, Types } from 'mongoose'
import { modelNames } from '@/constants/database.constants'
import { BaseSchema, IBaseModel } from '@/models/base.model'

export interface IRole extends IBaseModel {
  _id: Types.ObjectId
  name: string
}

const roleSchema = new Schema<IRole>({
  name: { type: String, required: true, trim: true },
})

roleSchema.add(BaseSchema)

roleSchema.index({ name: 1 }, { unique: true })

export const Role = model<IRole>(
  modelNames.ROLE.modelName,
  roleSchema,
  modelNames.ROLE.collectionName,
)
