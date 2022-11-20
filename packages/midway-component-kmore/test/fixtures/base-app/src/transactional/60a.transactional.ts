import assert from 'node:assert/strict'

import {
  Config as _Config,
  Controller,
  Get,
  Init,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import {
  DbManager,
  Kmore,
  Transactional,
} from '~/index'
import type { Db } from '@/test.model'
import { apiPrefix, apiRoute } from '../api-route'


@Controller(apiPrefix.methodDecorator)
export class TrxDecoratorController {

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db, Context>
  ref_tb_user: Kmore<Db, Context>['camelTables']['ref_tb_user']
  ref_tb_user_ext: Kmore<Db, Context>['camelTables']['ref_tb_user_ext']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    this.ref_tb_user = db.camelTables.ref_tb_user
    this.ref_tb_user_ext = db.camelTables.ref_tb_user_ext
  }

  @Transactional()
  @Get(`/${apiRoute.simple}`)
  async simple(): Promise<'OK'> {
    const trx = await this.db.transaction()
    assert(trx)
    await trx.rollback()

    const users = await this.ref_tb_user()
    assert(users && users.length === 3)

    const user2 = await this.db.camelTables.ref_tb_user()
    void user2
    return 'OK'
  }


}

