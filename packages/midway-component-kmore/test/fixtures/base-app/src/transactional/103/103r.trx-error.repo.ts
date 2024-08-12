import assert from 'node:assert'

import { Init, Inject, Singleton } from '@midwayjs/core'
import { KmoreTransaction } from 'kmore'

import {
  DbManager,
  Kmore,
} from '../../types/index.js'
import type { Db } from '../../types/test.model.js'


@Singleton()
export class TrxRepo {

  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db>
  tb_user: Kmore<Db>['camelTables']['tb_user']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    this.tb_user = db.camelTables.tb_user
  }

  async rollback(uid: number): Promise<never> {
    const currCtime = await this.tb_user()
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)
    assert(currCtime)

    const trx = await this.db.transaction()
    assert(trx)
    await this.update(uid, trx)
    await trx.rollback()

    await this.tb_user()
      .transacting(trx) // trx closed early
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)

    assert(false, 'should not reach here')
  }

  async commit(uid: number): Promise<never> {
    const currCtime = await this.tb_user()
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)
    assert(currCtime)

    const trx = await this.db.transaction()
    assert(trx)
    await this.update(uid, trx)
    await trx.commit()

    await this.tb_user()
      .transacting(trx) // trx closed early
      .select('ctime')
      .where({ uid })
      .then(rows => rows[0]?.ctime)

    assert(false, 'should not reach here')
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

