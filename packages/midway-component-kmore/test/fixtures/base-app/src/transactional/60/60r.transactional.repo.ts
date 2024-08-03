import assert from 'node:assert'

import { Inject, Init, Singleton } from '@midwayjs/core'

import {
  DbManager,
  Kmore,
  PropagationType,
  Transactional,
} from '../../types/index.js'
import type { Db } from '../../types/test.model.js'


@Singleton()
export class TrxDecoratorRepo {

  @Inject() readonly dbManager: DbManager<'master', Db>

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

  @Transactional({ propagationType: PropagationType.REQUIRED })
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

