import assert from 'node:assert'

import {
  Controller,
  Get,
  Init,
  Inject,
  Param,
} from '@midwayjs/core'
import { Context } from '@mwcp/share'
import { KmoreTransaction } from 'kmore'

import {
  DbManager,
  Kmore,
} from './types/index.js'
import type { Db } from './types/test.model.js'


@Controller('/trx_error')
export class TrxController {

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db, Context>
  tb_user: Kmore<Db, Context>['camelTables']['tb_user']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    this.tb_user = db.camelTables.tb_user
  }

  @Get('/close_early/rollback/:id')
  async rollback(@Param('id') uid: number): Promise<'OK'> {
    const currCtime = await this.tb_user()
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)
    assert(currCtime)

    const trx = await this.db.transaction()
    assert(trx)
    await this.update(uid, trx)
    await trx.rollback()

    try {
      await this.tb_user()
        .transacting(trx) // trx closed early
        .select('ctime')
        .where({ uid })
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
    const currCtime = await this.tb_user()
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)
    assert(currCtime)

    const trx = await this.db.transaction()
    assert(trx)
    await this.update(uid, trx)
    await trx.commit()

    try {
      await this.tb_user()
        .transacting(trx) // trx closed early
        .select('ctime')
        .where({ uid })
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
    const currCtime = await this.tb_user()
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)
    assert(currCtime)

    const newTime = new Date()
    await this.tb_user()
      .transacting(trx)
      .forUpdate()
      .update({
        ctime: newTime,
      })
      .where({ uid })

    const currCtime2 = await this.tb_user()
      .transacting(trx)
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)
    assert(currCtime2)

    assert(currCtime2 > currCtime)
  }

}

