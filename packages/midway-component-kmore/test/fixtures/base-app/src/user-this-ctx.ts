import assert from 'node:assert'

import {
  Controller,
  Get,
  Init,
  Inject,
  Param,
} from '@midwayjs/core'
import { Context, MConfig } from '@mwcp/share'

import {
  ConfigKey,
  DbManager,
  Kmore,
  MiddlewareConfig,
} from './types/index.js'
import type { Db, UserDTO } from './types/test.model.js'


@Controller('/user_this')
export class UserThisController {

  @MConfig(ConfigKey.middlewareConfig) protected readonly mwConfig: MiddlewareConfig

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  tb_user: Kmore<Db, Context>['camelTables']['tb_user']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)
    const tb_user = db.camelTables.tb_user
    this.tb_user = tb_user
  }


  @Get('/:id')
  async user(@Param('id') uid: number): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const user = await this.tb_user()
      .select('*')
      .where({ uid })

    const { tb_user } = db.camelTables
    const user2 = await tb_user()
      .select('*')
      .where({ uid })

    const user3 = await db.camelTables.tb_user()
      .select('*')
      .where({ uid })

    assert(user)
    assert(user[0])
    assert(typeof user[0].realName === 'string', JSON.stringify(user))

    assert.deepStrictEqual(user, user2)
    assert.deepStrictEqual(user, user3)

    return user
  }

}

