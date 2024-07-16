import assert from 'node:assert/strict'

import {
  Init,
  Inject,
} from '@midwayjs/core'
import { CacheConfigKey, Cacheable } from '@mwcp/cache'
import type { Context } from '@mwcp/share'
import { KmoreQueryBuilder, TrxPropagateOptions } from 'kmore'


import {
  DbManager,
  Kmore,
  Transactional,
} from '../../../../../dist/index.js'
import type { Db, UserDTO } from '../../../../test.model.js'

import { validateMeta } from './70.helper.js'


@Transactional()
export class UserRepo6 {

  name = 'UserRepo6'

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

  @Transactional()
  async userAll2(): Promise<void> {
    const [users, trx] = await this.getUsers()
    assert(users && users.length === 3)

    const cacheKey = `${this.name}.getUser2`
    const d1 = await this.getUsers2()
    // @ts-ignore
    assert(! d1[CacheConfigKey.CacheMetaType])
    const d2 = await this.getUsers2()
    validateMeta(d2, cacheKey, 10)

    const [users2, trx2] = await this.getUsers()
    assert(users2 && users2.length === 3)
    assert(trx === trx2)
  }


  async userAll(): Promise<void> {
    const [users, trx] = await this.getUsers()
    assert(users && users.length === 3)

    const cacheKey = `${this.name}.getUser2`
    const d1 = await this.getUsers2()
    // @ts-ignore
    assert(! d1[CacheConfigKey.CacheMetaType])
    const d2 = await this.getUsers2()
    validateMeta(d2, cacheKey, 10)

    const [users2, trx2] = await this.getUsers()
    assert(users2 && users2.length === 3)
    assert(trx === trx2)
  }

  @Cacheable<UserRepo6['getUsers']>()
  @Transactional()
  async getUsers(): Promise<[UserDTO[], symbol, TrxPropagateOptions]> {
    const builder = this.tb_user()
    const { trxPropagateOptions } = builder
    const users = await builder
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(users)
    assert(trxPropagateOptions)
    assert(trxPropagateOptions.key === `${this.name}:getUsers`, JSON.stringify(trxPropagateOptions))
    return [users, trxId, trxPropagateOptions]
  }

  async getUserByUid(uid: UserDTO['uid']): Promise<[UserDTO | undefined, symbol, TrxPropagateOptions]> {
    const builder = this.tb_user()
    const { trxPropagateOptions } = builder
    const user = await builder
      .where({ uid })
      .first()

    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(trxId)
    // assert(user)
    assert(trxPropagateOptions)
    assert(trxPropagateOptions.key === `${this.name}:getUserByUid`, JSON.stringify(trxPropagateOptions))
    return [user, trxId, trxPropagateOptions]
  }


  @Cacheable({
    key: '', // ignore value of expectTotal
  })
  @Transactional()
  async getUsers2(expectTotal = 3): Promise<UserDTO[]> {
    const users = await this.db.camelTables.tb_user()
    assert(users && users.length === expectTotal)
    return users
  }

  async updateUser(uid: UserDTO['uid'], realName: UserDTO['realName']): Promise<UserDTO> {
    assert(uid)
    assert(realName)

    const user = await this.tb_user()
      .where({ uid })
      .update({ realName })
      .returning('*')
      .then(rows => rows[0])

    assert(user)
    assert(user.uid === uid)
    assert(user.realName === realName)
    return user
  }

  async delUser(uid: UserDTO['uid']): Promise<[UserDTO, symbol, TrxPropagateOptions]> {
    assert(uid)

    const builder = this.tb_user()
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

  async delUserAll(): Promise<UserDTO> {
    return this.tb_user().del()
  }


  // NOTE: .forShare() will not be append with aggregate function!
  async countUser(): Promise<[number, symbol, TrxPropagateOptions]> {
    const builder = this.tb_user()
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

