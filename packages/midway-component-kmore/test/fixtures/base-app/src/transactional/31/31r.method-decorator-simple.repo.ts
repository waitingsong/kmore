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
export class UserRepo {

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
    // const trx0 = await this.db.transaction()
    // assert(trx0, 'trx0 should be defined')
    // await trx0.rollback()

    // const trx1 = await this.db.transaction()
    // assert(trx1, 'trx1 should be defined')
    // await trx1.commit()

    const [users, trx] = await this.getUsers()
    assert(users && users.length === 3)
    assert(trx, 'trx should be defined')

    // const [, trx3] = await this.getUsers2()
    // assert(trx3, 'trx3 should be defined')
    // assert(trx === trx3, `trx !== trx3, trxId: ${trx.toString()}, trx3Id: ${trx3.toString()}`)

    const [users2, trx2] = await this.getUsers()
    assert(users2 && users2.length === 3)
    assert(trx === trx2)
  }

  @Transactional()
  protected async getUsers(): Promise<[UserDTO[], symbol]> {
    const builder = this.tb_user()
    const users = await builder
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(users)

    const { kmoreQueryId } = builder
    const trx = this.db.getTrxByQueryId(kmoreQueryId)
    assert(trx, 'trx should be defined')

    return [users, trxId]
  }

  @Transactional()
  protected async getUsers2(): Promise<[UserDTO[], symbol]> {
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

