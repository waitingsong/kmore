import assert from 'node:assert'

import {
  Controller,
  Get,
  Init,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../types/api-test.js'
import {
  DbManager,
  Kmore,
  PropagationType,
  Transactional,
} from '../types/index.js'
import type { Db } from '../types/test.model.js'


@Controller(apiPrefix.methodDecorator)
export class TrxDecoratorController {

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db, Context>
  tb_user: Kmore<Db, Context>['camelTables']['tb_user']
  tb_user_ext: Kmore<Db, Context>['camelTables']['tb_user_ext']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    this.tb_user = db.camelTables.tb_user
    this.tb_user_ext = db.camelTables.tb_user_ext
  }

  @Transactional(PropagationType.REQUIRED)
  @Get(`/${apiRoute.simple}`)
  async simple(): Promise<'OK'> {
    const trx = await this.db.transaction()
    assert(trx)
    await trx.rollback()

    const users = await this.tb_user()
    assert(users && users.length === 3)

    const user2 = await this.db.camelTables.tb_user()
    void user2

    const ret = this._simple()
    return ret
  }

  protected _simple(): 'OK' {
    return 'OK'
  }

}

