import assert from 'node:assert/strict'

import {
  Config as _Config,
  Controller,
  Get,
  Init,
  Inject,
} from '@midwayjs/decorator'
import type { Context } from '@mwcp/share'

import {
  ConfigKey,
  DbManager,
  Kmore,
  MiddlewareConfig,
} from '~/index'
import { Db, UserDTO } from '../../../test.model'


@Controller('/user')
export class UserPagingController {

  @_Config(ConfigKey.middlewareConfig) protected readonly mwConfig: MiddlewareConfig

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db, Context>
  ref_tb_user: Kmore<Db, Context>['camelTables']['ref_tb_user']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    const ref_tb_user = db.camelTables.ref_tb_user
    this.ref_tb_user = ref_tb_user
  }


  @Get('/paging')
  async users(): Promise<UserDTO[]> {
    const users = await this.ref_tb_user()
      .autoPaging()

    assert(users)
    assert(users.length === 3)
    assert(users.total === 3)
    assert(users.page === 1)
    assert(users.pageSize)

    return users
  }

  @Get('/paging_trx')
  async usersTrx(): Promise<UserDTO[]> {
    const trx = await this.db.transaction()
    assert(trx)

    await this.ref_tb_user()
      .transacting(trx)
      .where('uid', 2)
      .del()

    const users = await this.ref_tb_user()
      .transacting(trx)
      .autoPaging()

    assert(users)
    assert(users.length === 2)
    assert(users.total === 2)
    assert(users.page === 1)
    assert(users.pageSize)

    await trx.rollback()

    const users2 = await this.ref_tb_user()
      .autoPaging()

    assert(users2)
    assert(users2.length === 3)
    assert(users2.total === 3)
    assert(users2.page === 1)

    return users2
  }

}

