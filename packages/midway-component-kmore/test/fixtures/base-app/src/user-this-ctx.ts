import assert from 'node:assert/strict'

import {
  Config as _Config,
  Controller,
  Get,
  Init,
  Inject,
  Param,
} from '@midwayjs/decorator'
import type { Context } from '@mwcp/share'

import {
  ConfigKey,
  DbManager,
  Kmore,
  MiddlewareConfig,
} from '~/index'
import { Db, UserDTO } from '../../../test.model'


@Controller('/user_this')
export class UserThisController {

  @_Config(ConfigKey.middlewareConfig) protected readonly mwConfig: MiddlewareConfig

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  ref_tb_user: Kmore<Db, Context>['camelTables']['ref_tb_user']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)
    const ref_tb_user = db.camelTables.ref_tb_user
    this.ref_tb_user = ref_tb_user
  }


  @Get('/:id')
  async user(@Param('id') uid: number): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const user = await this.ref_tb_user()
      .select('*')
      .where({ uid })

    const { ref_tb_user } = db.camelTables
    const user2 = await ref_tb_user()
      .select('*')
      .where({ uid })

    const user3 = await db.camelTables.ref_tb_user()
      .select('*')
      .where({ uid })

    assert(user)
    assert(user[0])
    assert(typeof user[0].realName === 'string')

    assert.deepStrictEqual(user, user2)
    assert.deepStrictEqual(user, user3)

    return user
  }

}

