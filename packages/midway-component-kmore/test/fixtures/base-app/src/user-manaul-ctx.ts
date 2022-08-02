import assert from 'node:assert/strict'

import {
  Config as _Config,
  Controller,
  Get,
  Inject,
  Param,
} from '@midwayjs/decorator'

import { Context } from '~/interface'
import {
  Config,
  ConfigKey,
  DbSourceManager,
  MiddlewareConfig,
} from '~/index'
import { Db, Db2, UserDTO, UserExtDTO } from '../../../test.model'


@Controller('/user2')
export class User2Controller {

  @_Config(ConfigKey.config) protected readonly config: Config
  @_Config(ConfigKey.middlewareConfig) protected readonly mwConfig: MiddlewareConfig

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbSourceManager<'master', Db>

  @Get('/:id')
  async user(@Param('id') uid: number): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const { ref_tb_user } = db.camelTables
    const user = await ref_tb_user(this.ctx)
      .select('*')
      .where({ uid })

    return user
  }

  @Get('/ext/:id')
  async userAll(@Param('id') uid: number): Promise<UserExtDTO[]> {
    const db = this.dbManager.getDataSource<Db2>('master')
    assert(db)

    const { ref_tb_user_ext } = db.camelTables
    const user = await ref_tb_user_ext(this.ctx)
      .select('*')
      .where({ uid })

    return user
  }

  @Get('/error')
  async userError(): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const { ref_tb_user } = db.camelTables
    const user = await ref_tb_user(this.ctx)
      .select('fake')

    return user
  }

}

