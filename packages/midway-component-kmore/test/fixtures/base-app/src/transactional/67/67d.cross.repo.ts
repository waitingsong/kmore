import assert from 'node:assert'

import { Init, Inject, Singleton } from '@midwayjs/core'
import { KmoreQueryBuilder, TrxPropagateOptions } from 'kmore'

import {
  DbManager,
  Kmore,
  Transactional,
} from '../../types/index.js'
import type { Db, UserDTO } from '../../types/test.model.js'


@Transactional()
@Singleton()
export class UserRepo5 {

  name = 'UserRepo5'

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

  @Transactional()
  async userAll2(): Promise<void> {
    const [users, trx] = await this.getUsers()
    assert(users && users.length === 3)

    await this.getUsers2()

    const [users2, trx2] = await this.getUsers()
    assert(users2 && users2.length === 3)
    assert(trx === trx2)
  }


  async userAll(): Promise<void> {
    const [users, trx] = await this.getUsers()
    assert(users && users.length === 3)

    await this.getUsers2()

    const [users2, trx2] = await this.getUsers()
    assert(users2 && users2.length === 3)
    assert(trx === trx2)
  }

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
    const trx = this.db.getTrxByQueryId(kmoreQueryId)
    assert(trx, 'trx not found')
    const { kmoreTrxId } = trx
    assert(kmoreTrxId, 'kmoreTrxId not found')
    return kmoreTrxId
  }

}

