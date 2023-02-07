import assert from 'node:assert/strict'

import {
  Config as _Config,
  Controller,
  Get,
  Inject,
  Param,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import {
  ConfigKey,
  DbManager,
  MiddlewareConfig,
} from '~/index'
import { Db, Db2, UserDTO, UserExtDTO } from '../../../test.model'


@Controller('/user')
export class UserController {

  @_Config(ConfigKey.middlewareConfig) protected readonly mwConfig: MiddlewareConfig

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  @Get('/:id')
  async user(@Param('id') uid: number): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const { ref_tb_user } = db.camelTables
    const user = await ref_tb_user()
      .select('*')
      .where({ uid })

    return user
  }

  @Get('/ext/:id')
  async userAll(@Param('id') uid: number): Promise<UserExtDTO[]> {
    const db = this.dbManager.getDataSource<Db2>('master')
    assert(db)

    const { ref_tb_user_ext } = db.camelTables
    const user = await ref_tb_user_ext()
      .select('*')
      .where({ uid })

    return user
  }

  @Get('/error')
  async userError(): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const { ref_tb_user } = db.camelTables
    const user = await ref_tb_user()
      .select('fake')

    return user
  }

}

