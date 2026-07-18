import { Schema } from 'mongoose'

export const BaseSchema = new Schema(
  {
    deletedAt: { type: Date },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
)

export interface IBaseModel {
  deletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}
