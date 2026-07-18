import { injectable } from 'inversify'
import { IRole, Role } from '@/modules/role/models/role.model'
import { IRepository } from '@/repositories/base.repository'

@injectable()
export class RoleRepository extends IRepository<IRole> {
  constructor() {
    super(Role)
  }

  async findByName(name: string) {
    return this.findOne({ name, deletedAt: null })
  }

  async insertMany(names: string[]) {
    return this.model.insertMany(names.map((name) => ({ name })))
  }
}
