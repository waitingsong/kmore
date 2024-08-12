import assert from 'node:assert'


import { Init, Inject, Singleton } from '@midwayjs/core'
import { KmoreTransaction, TrxControl } from 'kmore'

import { DbManager, Kmore } from '../../types/index.js'
import type { Db, UserDTO } from '../../types/test.model.js'


@Singleton()
export class TrxRepo {

  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db>
  tb_user: Kmore<Db>['camelTables']['tb_user']
  tb_user_ext: Kmore<Db>['camelTables']['tb_user_ext']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    this.tb_user = db.camelTables.tb_user
    this.tb_user_ext = db.camelTables.tb_user_ext
  }

  async commit(uid: number): Promise<UserDTO[]> {
    const trx = await this.db.transaction({ trxActionOnError: TrxControl.Commit })
    assert(trx)
    await this._update(uid, trx)
    throw new Error('trigger an error for trx auto commit by middleware test')
  }


  protected async _update(uid: number, trx: KmoreTransaction): Promise<void> {
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

