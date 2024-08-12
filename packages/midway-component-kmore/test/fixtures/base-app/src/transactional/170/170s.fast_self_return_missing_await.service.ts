import assert from 'node:assert'

import { Init, Inject, Provide } from '@midwayjs/core'

import {
  DbManager,
  Kmore,
  Transactional,
} from '../../types/index.js'
import type { Db, UserDTO } from '../../types/test.model.js'


@Provide()
export class UserService {

  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db>
  tb_user: Kmore<Db>['camelTables']['tb_user']
  tb_user_ext: Kmore<Db>['camelTables']['tb_user_ext']

  idx = 0

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    this.tb_user = db.camelTables.tb_user
    this.tb_user_ext = db.camelTables.tb_user_ext
  }


  @Transactional()
  async selfMissingAwait(): Promise<void> {
    this.idx += 1
    if (this.idx === 1) {
      return this.selfMissingAwait()
    }
    // void this.countUser()
    void 0
  }

  @Transactional()
  async countUser(): Promise<number> {
    const builder = this.tb_user()
    const total = await builder
      .count({ total: '*' })
      .then(rows => rows[0]?.total)
      .then(resp => resp ? +resp : 0)

    const { kmoreQueryId } = builder
    const trx = this.db.getTrxByQueryId(kmoreQueryId)
    assert(trx, 'trx should not be undefined')

    return total
  }


}

