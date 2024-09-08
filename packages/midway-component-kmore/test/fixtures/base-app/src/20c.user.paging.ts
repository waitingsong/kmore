import assert from 'node:assert'

import {
  Controller,
  Get,
  Init,
  Inject,
} from '@midwayjs/core'
import { TraceService } from '@mwcp/otel'
import { Context, MConfig } from '@mwcp/share'

import { apiBase, apiMethod } from './types/api-test.js'
import {
  ConfigKey,
  DbManager,
  Kmore,
  MiddlewareConfig,
} from './types/index.js'
import type { Db, UserDTO } from './types/test.model.js'


@Controller(apiBase.user)
export class UserPagingController {

  @MConfig(ConfigKey.middlewareConfig) protected readonly mwConfig: MiddlewareConfig

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>
  @Inject() traceService: TraceService

  db: Kmore<Db>
  tb_user: Kmore<Db>['camelTables']['tb_user']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    const tb_user = db.camelTables.tb_user
    this.tb_user = tb_user
  }


  @Get(`/${apiMethod.paging}`)
  async users(): Promise<string> {
    const builder = this.tb_user()
      .limit(2) // limit will be ignored by autoPaging()
      .autoPaging()
    const users = await builder

    assert(users)
    assert(users.length === 3, users.length.toString())
    assert(users.total === 3n, users.total.toString())
    assert(users.page === 1, users.page.toString())
    assert(users.pageSize, users.pageSize.toString())

    const traceId = this.traceService.getTraceId()
    return traceId
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

