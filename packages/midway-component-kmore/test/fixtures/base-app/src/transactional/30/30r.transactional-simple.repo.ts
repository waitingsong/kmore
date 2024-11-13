import assert from 'node:assert'

import { Init, Inject, Singleton } from '@midwayjs/core'
import { KmoreQueryBuilder } from 'kmore'

import {
  DbManager,
  Kmore,
  Transactional,
} from '../../types/index.js'
import type { Db, UserDTO } from '../../types/test.model.js'


@Singleton()
export class TransactionalSimpleRepo {

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

  @Transactional()
  async userAll(): Promise<void> {
    const [users, trx] = await this.getUserOne()
    assert(users && users.length === 1)
    assert(trx, 'trx should be defined')

    // const [users2, trx2] = await this.getUsers()
    // assert(users2 && users2.length === 3)
    // assert(trx === trx2)
  }

  @Transactional()
  protected async getUserOne(): Promise<[UserDTO[], symbol]> {
    const builder = this.tb_user()
    const users = await builder.where({ uid: 1 })
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(users)

    const { kmoreQueryId } = builder
    const trx = this.db.getTrxByQueryId(kmoreQueryId)
    assert(trx, 'trx should be defined')

    return [users, trxId]
  }

  @Transactional()
  protected async getUsers(): Promise<[UserDTO[], symbol]> {
    const builder = this.db.camelTables.tb_user()
    const users = await builder
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(users && users.length === 3)

    const { kmoreQueryId } = builder
    const trx = this.db.getTrxByQueryId(kmoreQueryId)
    assert(trx, 'trx should be defined')

    return [users, trxId]
  }


  protected validateBuilderLinkedTrx(builder: KmoreQueryBuilder<Db>): symbol {
    const { kmoreQueryId } = builder
    const trx = this.db.getTrxByQueryId(kmoreQueryId)
    assert(trx, 'trx not found')
    const { kmoreTrxId } = trx
    assert(kmoreTrxId, 'kmoreTrxId not found')
    return kmoreTrxId
  }

}

