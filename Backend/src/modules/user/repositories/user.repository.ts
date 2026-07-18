import { injectable } from 'inversify'
import { IRole } from '@/modules/role/models/role.model'
import { IUser, User } from '@/modules/user/models/user.model'
import { IRepository } from '@/repositories/base.repository'

@injectable()
export class UserRepository extends IRepository<IUser> {
  constructor() {
    super(User)
  }

  async findByEmail(email: string) {
    return this.model
      .findOne({ email, deletedAt: null })
      .select('+password')
      .populate<{ role: IRole }>('role')
  }

  async findDocumentById(id: string) {
    return this.model.findOne({ _id: id, deletedAt: null }).select('+password')
  }

  async findByEmailWithVerificationOtp(email: string) {
    return this.model
      .findOne({ email, deletedAt: null })
      .select('+verificationOtp')
  }

  async findByEmailWithResetOtp(email: string) {
    return this.model
      .findOne({ email, deletedAt: null })
      .select('+resetPasswordOtp')
  }
}
