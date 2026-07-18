import { container } from '@/inversify.config'
import { RoleService } from '@/modules/role/services/role.service'
import { TYPES } from '@/types/di.types'

export const seedDefaultRoles = async (): Promise<void> => {
  const roleService = container.get<RoleService>(TYPES.RoleService)
  await roleService.seedDefaultRoles()
}
