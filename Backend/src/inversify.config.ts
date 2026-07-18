import { Container } from 'inversify'
import { TYPES } from './types/di.types'
import { UserRepository } from './modules/user/repositories/user.repository'
import { RoleRepository } from './modules/role/repositories/role.repository'
import { RoleService } from './modules/role/services/role.service'
import { EmailService } from './modules/auth/services/email.service'
import { AuthService } from './modules/auth/services/auth.service'
import { AuthController } from './modules/auth/controllers/auth.controller'
import { UserService } from './modules/user/services/user.service'
import { UserController } from './modules/user/controllers/user.controller'

export const container = new Container()

container.bind(TYPES.UserRepository).to(UserRepository)
container.bind(TYPES.RoleRepository).to(RoleRepository)
container.bind(TYPES.RoleService).to(RoleService)
container.bind(TYPES.EmailService).to(EmailService)
container.bind(TYPES.AuthService).to(AuthService)
container.bind(TYPES.AuthController).to(AuthController)
container.bind(TYPES.UserService).to(UserService)
container.bind(TYPES.UserController).to(UserController)
