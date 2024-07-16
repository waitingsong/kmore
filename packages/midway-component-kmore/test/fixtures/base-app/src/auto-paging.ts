import assert from 'node:assert'

import {
  Controller,
  Get,
  Init,
  Inject,
} from '@midwayjs/core'
import { Context, MConfig } from '@mwcp/share'

import {
  ConfigKey,
  DbManager,
  Kmore,
  MiddlewareConfig,
} from './types/index.js'
import type { Db, UserDTO } from './types/test.model.js'


@Controller('/user')
export class UserPagingController {

  @MConfig(ConfigKey.middlewareConfig) protected readonly mwConfig: MiddlewareConfig

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db, Context>
  tb_user: Kmore<Db, Context>['camelTables']['tb_user']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    const tb_user = db.camelTables.tb_user
    this.tb_user = tb_user
  }


  @Get('/paging')
  async users(): Promise<UserDTO[]> {
    const users = await this.tb_user()
      .autoPaging()

    assert(users)
    assert(users.length === 3)
    assert(users.total === 3n)
    assert(users.page === 1)
    assert(users.pageSize)

    return users
  }

  @Get('/paging_trx')
  async usersTrx(): Promise<UserDTO[]> {
    const trx = await this.db.transaction()
    assert(trx)

    await this.tb_user()
      .transacting(trx)
      .where('uid', 2)
      .del()

    const users = await this.tb_user()
      .transacting(trx)
      .autoPaging()

    assert(users)
    assert(users.length === 2)
    assert(users.total === 2n)
    assert(users.page === 1)
    assert(users.pageSize)

    await trx.rollback()

    const users2 = await this.tb_user()
      .autoPaging()

    assert(users2)
    assert(users2.length === 3)
    assert(users2.total === 3n)
    assert(users2.page === 1)

    return users2
  }

}

