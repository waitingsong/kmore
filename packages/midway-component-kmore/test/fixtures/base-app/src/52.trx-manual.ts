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


@Controller('/trx_manual')
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

  @Get('/commit/:id')
  async userAll(@Param('id') uid: number): Promise<'OK'> {
    const trx = await this.db.transaction()
    assert(trx)
    await this.update(uid, trx)

    const currCtime2 = await this.tb_user()
      .transacting(trx)
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)
    assert(currCtime2)

    await trx.commit()
    return 'OK'
  }

  @Get('/rollback/:id')
  async user(@Param('id') uid: number): Promise<'OK'> {
    const trx = await this.db.transaction()
    assert(trx)
    await this.update(uid, trx)

    const currCtime2 = await this.tb_user()
      .transacting(trx)
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)
    assert(currCtime2)

    await trx.rollback()
    return 'OK'
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

