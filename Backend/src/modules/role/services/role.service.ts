import { inject, injectable } from 'inversify'
import ValidationError from '@/errors/validation.error'
import { DEFAULT_ROLES } from '@/modules/role/constants/role.constants'
import { IRole } from '@/modules/role/models/role.model'
import { RoleRepository } from '@/modules/role/repositories/role.repository'
import { TYPES } from '@/types/di.types'
import { isValidMongoId } from '@/utils/validation.utils'
import { logger } from '@/utils/logger.util'

@injectable()
export class RoleService {
  constructor(
    @inject(TYPES.RoleRepository)
    private readonly roleRepository: RoleRepository,
  ) {}

  async seedDefaultRoles(): Promise<void> {
    const existingRoles = await this.roleRepository.find({
      name: { $in: DEFAULT_ROLES },
    })
    const existingRoleNames = new Set(existingRoles.map((role) => role.name))
    const missingRoles = DEFAULT_ROLES.filter(
      (name) => !existingRoleNames.has(name),
    )

    if (missingRoles.length === 0) return

    await this.roleRepository.insertMany(missingRoles)
    logger.info(`Seeded default roles: ${missingRoles.join(', ')}`)
  }

  async resolveRole(identifier: string): Promise<IRole> {
    const role = isValidMongoId(identifier)
      ? await this.roleRepository.findById(identifier)
      : await this.roleRepository.findByName(identifier)

    if (!role || role.deletedAt) {
      throw new ValidationError([
        { field: 'role', message: 'Invalid role selected.' },
      ])
    }

    return role
  }
}
