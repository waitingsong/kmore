import assert from 'node:assert/strict'

import {
  Init,
  Inject,
} from '@midwayjs/core'
import { Cacheable } from '@mwcp/cache'
import type { Context } from '@mwcp/share'
import { KmoreQueryBuilder, TrxPropagateOptions } from 'kmore'

import {
  DbManager,
  Kmore,
  Transactional,
} from '../../../../../dist/index.js'
import type { Db, UserDTO } from '../../../../test.model.js'


@Transactional()
export class UserRepo8 {

  name = 'UserRepo8'

  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db, Context>
  tb_user: Kmore<Db, Context>['camelTables']['tb_user']
  tb_user_ext: Kmore<Db, Context>['camelTables']['tb_user_ext']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    this.tb_user = db.camelTables.tb_user
    this.tb_user_ext = db.camelTables.tb_user_ext
  }

  // @Cacheable()
  // async getUsersWitchCacheable(): Promise<[UserDTO[], symbol, TrxPropagateOptions]> {
  //   const builder = this.tb_user()
  //   const { trxPropagateOptions } = builder
  //   const users = await builder
  //   const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
  //   assert(users)
  //   assert(trxPropagateOptions)
  //   assert(trxPropagateOptions.key === `${this.name}:getUsers`, JSON.stringify(trxPropagateOptions))
  //   return [users, trxId, trxPropagateOptions]
  // }


  // @Transactional<UserRepo8['getUsers']>(void 0, void 0, {
  //   op: 'Cacheable',
  // })
  // async getUsers(): Promise<[UserDTO[], symbol, TrxPropagateOptions]> {
  //   const builder = this.tb_user()
  //   const { trxPropagateOptions } = builder
  //   const users = await builder
  //   const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
  //   assert(users)
  //   assert(trxPropagateOptions)
  //   assert(trxPropagateOptions.key === `${this.name}:getUsers`, JSON.stringify(trxPropagateOptions))
  //   return [users, trxId, trxPropagateOptions]
  // }

  // @Transactional<UserRepo8['getUserByUid']>(void 0, void 0, {
  //   op: 'Cacheable',
  //   key: input => input[0].toString(),
  // })
  // async getUserByUid(uid: UserDTO['uid']): Promise<[UserDTO | undefined, symbol, TrxPropagateOptions]> {
  //   const builder = this.tb_user()
  //   const { trxPropagateOptions } = builder
  //   const user = await builder
  //     .where({ uid })
  //     .first()

  //   const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
  //   assert(trxId)
  //   assert(trxPropagateOptions)
  //   assert(trxPropagateOptions.key === `${this.name}:getUserByUid`, JSON.stringify(trxPropagateOptions))
  //   return [user, trxId, trxPropagateOptions]
  // }


  @Transactional()
  @Cacheable<UserRepo8['getUserByUidWithCacheableAfter']>()
  async getUserByUidWithCacheableAfter(uid: UserDTO['uid']): Promise<[UserDTO | undefined, symbol, TrxPropagateOptions]> {
    const builder = this.tb_user()
    const { trxPropagateOptions } = builder
    const user = await builder
      .where({ uid })
      .first()

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(trxId)
    assert(trxPropagateOptions)
    assert(trxPropagateOptions.entryKey === 'UserService:withCacheableAfter', JSON.stringify(trxPropagateOptions))
    assert(trxPropagateOptions.key === `${this.name}:getUserByUidWithCacheableAfter`, JSON.stringify(trxPropagateOptions))
    return [user, trxId, trxPropagateOptions]
  }

  @Cacheable<UserRepo8['getUserByUidWithCacheableBefore']>({
    ttl: 30,
  })
  @Transactional()
  async getUserByUidWithCacheableBefore(uid: UserDTO['uid']): Promise<[UserDTO | undefined, symbol, TrxPropagateOptions]> {
    const builder = this.tb_user()
    const { trxPropagateOptions } = builder
    const user = await builder
      .where({ uid })
      .first()

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(trxId)
    assert(trxPropagateOptions)
    assert(trxPropagateOptions.entryKey === 'UserService:withCacheableBefore', JSON.stringify(trxPropagateOptions))
    assert(trxPropagateOptions.key === `${this.name}:getUserByUidWithCacheableBefore`, JSON.stringify(trxPropagateOptions))
    return [user, trxId, trxPropagateOptions]
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

