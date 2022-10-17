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
  DbManager,
  Kmore,
} from '~/index'
import type { Db, UserDTO } from '@/test.model'
import { KmoreTransaction } from 'kmore'


@Controller('/trx_error')
export class TrxController {

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db, Context>
  ref_tb_user: Kmore<Db, Context>['camelTables']['ref_tb_user']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    this.ref_tb_user = db.camelTables.ref_tb_user
  }

  @Get('/close_early/rollback/:id')
  async rollback(@Param('id') uid: number): Promise<'OK'> {
    const currCtime = await this.ref_tb_user()
      .select('ctime')
      .where({uid})
      .then(rows => rows[0]?.ctime)
    assert(currCtime)

    const trx = await this.db.transaction()
    assert(trx)
    await this.update(uid, trx)
    await trx.rollback()

    try {
      await this.ref_tb_user()
        .transacting(trx) // trx closed early
        .select('ctime')
        .where({uid})
        .then(rows => rows[0]?.ctime)
    }
    catch (ex) {
      assert(ex instanceof Error)
      const { message } = ex
      // message in package kmore
      assert(message.includes('Transaction already completed'), message)
      assert(message.includes('trxIdQueryMap not contains kmoreTrxId'), message)
      return 'OK'
    }

    throw new Error('should not reach here')
  }

  @Get('/close_early/commit/:id')
  async commit(@Param('id') uid: number): Promise<'OK'> {
    const currCtime = await this.ref_tb_user()
      .select('ctime')
      .where({uid})
      .then(rows => rows[0]?.ctime)
    assert(currCtime)

    const trx = await this.db.transaction()
    assert(trx)
    await this.update(uid, trx)
    await trx.commit()

    try {
      await this.ref_tb_user()
        .transacting(trx) // trx closed early
        .select('ctime')
        .where({uid})
        .then(rows => rows[0]?.ctime)
    }
    catch (ex) {
      assert(ex instanceof Error)
      const { message } = ex
      // message in package kmore
      assert(message.includes('Transaction already completed'), message)
      assert(message.includes('trxIdQueryMap not contains kmoreTrxId'), message)
      return 'OK'
    }

    throw new Error('should not reach here')
  }

  protected async update(uid: number, trx: KmoreTransaction): Promise<void> {
    const currCtime = await this.ref_tb_user()
      .select('ctime')
      .where({uid})
      .then(rows => rows[0]?.ctime)
    assert(currCtime)

    const newTime = new Date()
    await this.ref_tb_user()
      .transacting(trx)
      .forUpdate()
      .update({
        ctime: newTime,
      })
      .where({uid})

    const currCtime2 = await this.ref_tb_user()
      .transacting(trx)
      .select('ctime')
      .where({uid})
      .then(rows => rows[0]?.ctime)
    assert(currCtime2)

    assert(currCtime2 > currCtime)
  }

}

