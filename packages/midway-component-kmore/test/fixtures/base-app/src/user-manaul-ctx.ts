import assert from 'node:assert'

import {
  Controller,
  Get,
  Inject,
  Param,
} from '@midwayjs/core'
import { Context, MConfig } from '@mwcp/share'

import {
  ConfigKey,
  DbManager,
  MiddlewareConfig,
} from './types/index.js'
import type { Db, Db2, UserDTO, UserExtDTO } from './types/test.model.js'


@Controller('/user2')
export class User2Controller {

  @MConfig(ConfigKey.middlewareConfig) protected readonly mwConfig: MiddlewareConfig

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  @Get('/:id')
  async user(@Param('id') uid: number): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const { tb_user } = db.camelTables
    const user = await tb_user()
      .select('*')
      .where({ uid })

    return user
  }

  @Get('/ext/:id')
  async userAll(@Param('id') uid: number): Promise<UserExtDTO[]> {
    const db = this.dbManager.getDataSource<Db2>('master')
    assert(db)

    const { tb_user_ext } = db.camelTables
    const user = await tb_user_ext()
      .select('*')
      .where({ uid })

    return user
  }

  @Get('/error')
  async userError(): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const { tb_user } = db.camelTables
    const user = await tb_user()
      .select('fake')

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user
  }

}

