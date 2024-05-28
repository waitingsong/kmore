import assert from 'node:assert/strict'

import { Init, Inject } from '@midwayjs/core'
import type { Context } from '@mwcp/share'
import { KmoreQueryBuilder, TrxPropagateOptions } from 'kmore'

import {
  DbManager,
  Kmore,
  Transactional,
} from '../../../../../dist/index.js'
import type { Db, UserDTO } from '../../../../test.model.js'


@Transactional()
export class UserRepo100 {

  name = 'UserRepo6'

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

  @Transactional()
  async delUser(uid: UserDTO['uid']): Promise<[UserDTO, symbol, TrxPropagateOptions]> {
    assert(uid)

    const builder = this.ref_tb_user()
    const { trxPropagateOptions } = builder
    const user = await builder
      .where({ uid })
      .del()
      .returning('*')
      .then(rows => rows[0])

    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(trxId)
    assert(user)
    assert(user.uid === uid)
    assert(trxPropagateOptions)
    assert(trxPropagateOptions.key === `${this.name}:delUser`, JSON.stringify(trxPropagateOptions))
    return [user, trxId, trxPropagateOptions]
  }

  @Transactional()
  async delUserAll(): Promise<number> {
    return this.ref_tb_user().del()
  }

  @Transactional()
  async delUserAllThrowError(): Promise<void> {
    await this.ref_tb_user().del()
    throw new Error('test:delUserAllThrowError')
  }

  async countUser(): Promise<[number, symbol, TrxPropagateOptions]> {
    const builder = this.ref_tb_user()
    const { trxPropagateOptions } = builder
    const trxId = this.validateBuilderLinkedTrx(builder)
    const total = await builder
      .count({ total: '*' })
      .then(rows => rows[0]?.total)
      .then(resp => resp ? +resp : 0)

    assert(trxPropagateOptions)
    assert(trxPropagateOptions.key === `${this.name}:countUser`, JSON.stringify(trxPropagateOptions))
    return [total, trxId, trxPropagateOptions]
  }


  protected validateBuilderLinkedTrx(builder: KmoreQueryBuilder<Db>): symbol {
    const { kmoreQueryId } = builder
    const trx = this.db.getTrxByKmoreQueryId(kmoreQueryId)
    assert(trx, 'trx not found')
    const { kmoreTrxId } = trx
    assert(kmoreTrxId, 'kmoreTrxId not found')
    return kmoreTrxId
  }

}

