import { inject, injectable } from 'inversify'
import ConflictError from '@/errors/conflict.error'
import NotFoundError from '@/errors/not-found.error'
import { RoleService } from '@/modules/role/services/role.service'
import { IUser } from '@/modules/user/models/user.model'
import {
  CreateUserDTO,
  UpdateUserDTO,
} from '@/modules/user/dtos/user.dto'
import { UserRepository } from '@/modules/user/repositories/user.repository'
import { TYPES } from '@/types/di.types'

type UserLike = Pick<
  IUser,
  '_id' | 'firstName' | 'lastName' | 'email' | 'createdAt' | 'updatedAt'
>

@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserRepository)
    private readonly userRepository: UserRepository,
    @inject(TYPES.RoleService)
    private readonly roleService: RoleService,
  ) {}

  async list() {
    const users = await this.userRepository.find({ deletedAt: null })
    return users.map((user) => this.formatUser(user as UserLike))
  }

  async getById(userId: string) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.deletedAt) {
      throw new NotFoundError({
        error: 'USER_NOT_FOUND',
        message: 'User not found.',
      })
    }

    return this.formatUser(user as UserLike)
  }

  async create(data: CreateUserDTO) {
    const existingUser = await this.userRepository.findOne({
      email: data.email,
      deletedAt: null,
    })
    if (existingUser) {
      throw new ConflictError({
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'A user with this email already exists.',
      })
    }

    const role = await this.roleService.resolveRole(data.role)

    const user = await this.userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: role._id,
    })

    return this.formatUser(user)
  }

  async update(userId: string, data: UpdateUserDTO) {
    const user = await this.userRepository.findDocumentById(userId)
    if (!user || user.deletedAt) {
      throw new NotFoundError({
        error: 'USER_NOT_FOUND',
        message: 'User not found.',
      })
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        email: data.email,
        deletedAt: null,
      })
      if (existingUser) {
        throw new ConflictError({
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'A user with this email already exists.',
        })
      }
    }

    if (data.firstName !== undefined) user.firstName = data.firstName
    if (data.lastName !== undefined) user.lastName = data.lastName
    if (data.email !== undefined) user.email = data.email
    if (data.password !== undefined) user.password = data.password

    const updatedUser = await user.save()
    return this.formatUser(updatedUser)
  }

  async delete(userId: string) {
    const user = await this.userRepository.findDocumentById(userId)
    if (!user || user.deletedAt) {
      throw new NotFoundError({
        error: 'USER_NOT_FOUND',
        message: 'User not found.',
      })
    }

    user.deletedAt = new Date()
    await user.save()
  }

  private formatUser(user: UserLike) {
    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
