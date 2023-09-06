import assert from 'node:assert/strict'

import {
  Config as _Config,
  Controller,
  Get,
  Init,
  Inject,
  Param,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'
import { KmoreTransaction } from 'kmore'

import {
  DbManager,
  Kmore,
} from '../../../../dist/index.js'
import type { Db, UserDTO } from '../../../test.model.js'


@Controller('/middle_trx_auto_action')
export class UserController {

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

  @Get('/commit/:id')
  async userAll(@Param('id') uid: number): Promise<UserDTO[]> {
    const trx = await this.db.transaction({ trxActionOnEnd: 'commit' })
    assert(trx)

    await this.update(uid, trx)

    throw new Error('trigger an error for trx auto commit by middleware test')
  }

  @Get('/rollback/:id')
  async user(@Param('id') uid: number): Promise<void> {
    const trx = await this.db.transaction()
    assert(trx)

    await this.update(uid, trx)

    throw new Error('trx auto rollback by middleware debug')
  }


  protected async update(uid: number, trx: KmoreTransaction): Promise<void> {
    const currCtime = await this.ref_tb_user()
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)
    assert(currCtime)

    const newTime = new Date()
    await this.ref_tb_user()
      .transacting(trx)
      .forUpdate()
      .update({
        ctime: newTime,
      })
      .where({ uid })

    const currCtime2 = await this.ref_tb_user()
      .transacting(trx)
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)
    assert(currCtime2)

    assert(currCtime2 > currCtime)
  }

}

