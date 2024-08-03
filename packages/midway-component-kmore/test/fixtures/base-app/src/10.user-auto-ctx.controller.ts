import { Controller, Get, Inject, Param } from '@midwayjs/core'
import { Context, MConfig } from '@mwcp/share'

import { UserRepo } from './10.user-auto-ctx.repo.js'
import { ConfigKey, MiddlewareConfig } from './types/index.js'
import type { UserDTO, UserExtDTO } from './types/test.model.js'


@Controller('/user')
export class UserController {

  @MConfig(ConfigKey.middlewareConfig) protected readonly mwConfig: MiddlewareConfig

  @Inject() readonly ctx: Context
  @Inject() readonly repo: UserRepo

  @Get('/:id')
  async user(@Param('id') uid: number): Promise<UserDTO[]> {
    const user = await this.repo.user(uid)
    return user
  }

  @Get('/ext/:id')
  async userAll(@Param('id') uid: number): Promise<UserExtDTO[]> {
    const user = await this.repo.userAll(uid)
    return user
  }

  @Get('/error')
  async userError(): Promise<UserDTO[]> {
    const user = await this.repo.userError()
    return user
  }

}

