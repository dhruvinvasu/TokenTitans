import {
  Document,
  FilterQuery,
  Model,
  ProjectionType,
  QueryOptions,
  UpdateQuery,
} from 'mongoose'

export type CreateDocument<T> = Omit<
  T,
  '_id' | 'createdAt' | 'updatedAt' | 'deletedAt' | keyof Document
>

export abstract class IRepository<T> {
  protected model: Model<T>
  protected defaultFindQueryOptions: QueryOptions = { lean: true }

  constructor(model: Model<T>) {
    this.model = model
  }

  async findById(id: string, projection?: ProjectionType<T>) {
    return this.model.findById(id, projection, this.defaultFindQueryOptions)
  }

  async findOne(filter: FilterQuery<T>, projection?: ProjectionType<T>) {
    return this.model.findOne(filter, projection, this.defaultFindQueryOptions)
  }

  async find(filter: FilterQuery<T>, projection?: ProjectionType<T>) {
    return this.model.find(filter, projection, this.defaultFindQueryOptions)
  }

  async create(data: CreateDocument<T>) {
    return this.model.create(data)
  }

  async updateById(id: string, data: UpdateQuery<T>) {
    return this.model.findByIdAndUpdate(id, data, {
      new: true,
      ...this.defaultFindQueryOptions,
    })
  }

  async deleteById(id: string) {
    return this.model.findByIdAndDelete(id, this.defaultFindQueryOptions)
  }
}
