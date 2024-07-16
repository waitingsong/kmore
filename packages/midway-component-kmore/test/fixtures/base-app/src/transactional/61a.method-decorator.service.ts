import assert from 'node:assert/strict'

import {
  Init,
  Inject,
  Provide,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'
import { KmoreQueryBuilder } from 'kmore'

import {
  DbManager,
  Kmore,
  Transactional,
} from '../../../../../dist/index.js'
import type { Db, UserDTO } from '../../../../test.model.js'


@Provide()
export class UserService {

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
  async userAll(): Promise<void> {
    const [users, trx] = await this.getUsers()
    assert(users && users.length === 3)

    const [, trx3] = await this.getUsers2()
    assert(trx === trx3)

    const [users2, trx2] = await this.getUsers()
    assert(users2 && users2.length === 3)
    assert(trx === trx2)
  }

  @Transactional()
  async getUsers(): Promise<[UserDTO[], symbol]> {
    const builder = this.tb_user()
    const users = await builder
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(users)
    return [users, trxId]
  }

  @Transactional()
  async getUserByUid(uid: UserDTO['uid']): Promise<UserDTO> {
    const user = await this.tb_user()
      .where({ uid })
      .first()
    assert(user)
    return user
  }

  async getUsersNoTrx(): Promise<UserDTO[]> {
    const users = await this.tb_user()
    assert(users)
    return users
  }

  @Transactional()
  async getUsers2(): Promise<[UserDTO[], symbol]> {
    const builder = this.db.camelTables.tb_user()
    const users = await builder
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(users && users.length === 3)
    return [users, trxId]
  }

  @Transactional()
  async userAllWithUpdate(): Promise<void> {
    const [users, trx] = await this.getUsers()
    const [user] = users
    assert(user && user.realName !== 'test')

    const uid = 1
    const realName = 'test' + Math.random().toString()
    const user2 = await this.updateUser(uid, realName)
    assert(user2.realName === realName)

    const [users3, trx3] = await this.getUsers()
    assert(users3 && users3.length === 3)
    users3.forEach((row) => {
      if (row.uid === uid) {
        assert(row.realName === realName)
      }
      else {
        assert(row.realName !== realName)
      }
    })
    assert(trx === trx3)
  }

  @Transactional()
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

  @Transactional()
  async delUser(uid: UserDTO['uid']): Promise<[UserDTO, symbol]> {
    assert(uid)

    const builder = this.tb_user()
    const user = await builder
      .where({ uid })
      .del()
      .returning('*')
      .then(rows => rows[0])
    assert(user)
    assert(user.uid === uid)

    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    return [user, trxId]
  }

  @Transactional()
  async delUserAll(): Promise<[symbol]> {
    const builder = this.tb_user()
    await builder.del()
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    return [trxId]
  }

  @Transactional()
  async userUpdateDel(
    uid: UserDTO['uid'],
    expectTotal: number,
    expectTotalNoTrx: number,
  ): Promise<void> {

    const [total0, trx0] = await this.countUser()
    assert(total0 === expectTotal)

    const user = await this.getUserByUid(uid)
    assert(user, 'user not found')
    const name = 'rn' + uid.toString()
    assert(user.realName === name, JSON.stringify(user) + ' vs ' + name)

    const realName = 'test' + Math.random().toString()
    const user2 = await this.updateUser(uid, realName)
    assert(user2.realName === realName)

    const [user3, trx3] = await this.getUsers()
    user3.forEach((row) => {
      if (row.uid === uid) {
        assert(row.realName === realName)
      }
    })
    assert(trx0 === trx3)

    const [user4, trx4] = await this.delUser(uid)
    assert(user4.uid === uid)
    assert(user4.realName === realName)
    assert(trx0 === trx4)

    const total1 = await this.countUserNoTrx()
    assert(
      total1 === expectTotalNoTrx,
      `uid: ${uid}, total (wo trx): ${total1.toString()}, expectTotalNoTrx: ${expectTotalNoTrx}`,
    )

    // NOTE: .forShare() will not be append with aggregate function!
    const [total2, trx2] = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())
    assert(trx0 === trx2)

    const user5 = await this.getUsersNoTrx()
    assert(user5.length === expectTotalNoTrx, user5.length.toString())

    const [user6, trx6] = await this.getUsers()
    assert(user6.length === expectTotal - 1, user6.length.toString())
    assert(trx0 === trx6)
  }


  async countUserNoTrx(): Promise<number> {
    const builder = this.tb_user()
    const total = await builder
      .count({ total: '*' })
      .then(rows => rows[0]?.total)
      .then(resp => resp ? +resp : 0)

    const { kmoreQueryId } = builder
    const trx = this.db.getTrxByKmoreQueryId(kmoreQueryId)
    assert(! trx, 'trx should be undefined')

    return total
  }

  // NOTE: .forShare() will not be append with aggregate function!
  @Transactional()
  async countUser(): Promise<[number, symbol]> {
    const builder = this.tb_user()
    const total = await builder
      .count({ total: '*' })
      .then(rows => rows[0]?.total)
      .then(resp => resp ? +resp : 0)
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"

    return [total, trxId]
  }

  @Transactional()
  async userUpdateDelAll(): Promise<void> {
    await this.userUpdateDel(1, 3, 3)
    await this.delUserAll()

    const total1 = await this.countUserNoTrx()
    assert(total1 > 0, total1.toString())

    // NOTE: .forShare() will not be append with aggregate function!
    const [total2, trx2] = await this.countUser()
    assert(total2 === 0, total2.toString())

    const user5 = await this.getUsersNoTrx()
    assert(user5.length > 0, user5.length.toString())

    const [user6, trx6] = await this.getUsers()
    assert(user6.length === 0, user6.length.toString())
    assert(trx2 === trx6)
  }

  @Transactional()
  async truncateTbUser(): Promise<void> {
    await this.tb_user().truncate()
  }


  @Transactional()
  async selfUserUpdateDel(
    uid: UserDTO['uid'],
    expectTotal: number,
    expectTotalNoTrx: number,
  ): Promise<void> {

    const [total0, trx0] = await this.countUser()
    assert(total0 === expectTotal)
    if (total0 === 0) {
      return
    }

    const user = await this.getUserByUid(uid)
    assert(user, 'user not found')
    const name = 'rn' + uid.toString()
    assert(user.realName === name, JSON.stringify(user) + ' vs ' + name)

    const realName = 'test' + Math.random().toString()
    const user2 = await this.updateUser(uid, realName)
    assert(user2.realName === realName)

    const [user3, trx3] = await this.getUsers()
    user3.forEach((row) => {
      if (row.uid === uid) {
        assert(row.realName === realName)
      }
    })
    assert(trx0 === trx3)

    const [user4, trx4] = await this.delUser(uid)
    assert(user4.uid === uid)
    assert(user4.realName === realName)
    assert(trx0 === trx4)

    const total1 = await this.countUserNoTrx()
    assert(total1 === expectTotalNoTrx, `${total1.toString()}, ${expectTotalNoTrx}`)

    // NOTE: .forShare() will not be append with aggregate function!
    const [total2, trx2] = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())
    assert(trx0 === trx2)

    const user5 = await this.getUsersNoTrx()
    assert(user5.length === expectTotalNoTrx, user5.length.toString())

    const [user6, trx6] = await this.getUsers()
    assert(user6.length === expectTotal - 1, user6.length.toString())
    assert(trx0 === trx6)

    if (total2 > 0) {
      await this.selfUserUpdateDel(uid + 1, expectTotal - 1, expectTotalNoTrx)
    }
    else {
      return
    }
  }

  @Transactional()
  async selfMissingAwait(
    uid: UserDTO['uid'],
    expectTotal: number,
    expectTotalNoTrx: number,
  ): Promise<void> {

    const [total0, trx0] = await this.countUser()
    assert(total0 === expectTotal)
    if (total0 === 0) {
      return
    }

    const user = await this.getUserByUid(uid)
    assert(user, 'user not found')
    const name = 'rn' + uid.toString()
    assert(user.realName === name, JSON.stringify(user) + ' vs ' + name)

    const [user4, trx4] = await this.delUser(uid)
    assert(user4.uid === uid)
    assert(trx0 === trx4)

    const total1 = await this.countUserNoTrx()
    assert(total1 === expectTotalNoTrx, `${total1.toString()}, ${expectTotalNoTrx}`)

    // NOTE: .forShare() will not be append with aggregate function!
    const [total2, trx2] = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())
    assert(trx0 === trx2)

    const user5 = await this.getUsersNoTrx()
    assert(user5.length === expectTotalNoTrx, user5.length.toString())

    const [user6, trx6] = await this.getUsers()
    assert(user6.length === expectTotal - 1, user6.length.toString())
    assert(trx0 === trx6)

    if (total2 > 0) {
      // Debug: no await
      void this.selfMissingAwait(uid + 1, expectTotal - 1, expectTotalNoTrx)
    }
    else {
      return
    }
  }

  @Transactional()
  async selfReturnPromise(
    uid: UserDTO['uid'],
    expectTotal: number,
    expectTotalNoTrx: number,
  ): Promise<void> {

    const [total0, trx0] = await this.countUser()
    assert(total0 === expectTotal)
    if (total0 === 0) {
      return
    }

    const user = await this.getUserByUid(uid)
    assert(user, 'user not found')
    const name = 'rn' + uid.toString()
    assert(user.realName === name, JSON.stringify(user) + ' vs ' + name)

    const [user4, trx4] = await this.delUser(uid)
    assert(user4.uid === uid)
    assert(trx0 === trx4)

    const total1 = await this.countUserNoTrx()
    assert(total1 === expectTotalNoTrx, `${total1.toString()}, ${expectTotalNoTrx}`)

    // NOTE: .forShare() will not be append with aggregate function!
    const [total2, trx2] = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())
    assert(trx0 === trx2)

    const user5 = await this.getUsersNoTrx()
    assert(user5.length === expectTotalNoTrx, user5.length.toString())

    const [user6, trx6] = await this.getUsers()
    assert(user6.length === expectTotal - 1, user6.length.toString())
    assert(trx0 === trx6)

    if (total2 > 0) {
      return this.selfReturnPromise(uid + 1, expectTotal - 1, expectTotalNoTrx)
    }
    else {
      return
    }
  }

  @Transactional()
  async throwError(
    uid: UserDTO['uid'],
    expectTotal: number,
    expectTotalNoTrx: number,
  ): Promise<void> {

    await this._del(uid, expectTotal, expectTotalNoTrx)
    throw new Error('test error for throwError')
  }

  @Transactional()
  async returnReject(
    uid: UserDTO['uid'],
    expectTotal: number,
    expectTotalNoTrx: number,
  ): Promise<void> {

    await this._del(uid, expectTotal, expectTotalNoTrx)
    return Promise.reject(new Error('test error for returnReject'))
  }


  @Transactional()
  protected async _del(
    uid: UserDTO['uid'],
    expectTotal: number,
    expectTotalNoTrx: number,
  ): Promise<void> {

    const [total0, trx0] = await this.countUser()
    assert(total0 === expectTotal)

    const [user4, trx4] = await this.delUser(uid)
    assert(user4.uid === uid)
    assert(trx0 === trx4)

    const [total2, trx2] = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())
    assert(trx2 === trx0)

    const user5 = await this.getUsersNoTrx()
    assert(user5.length === expectTotalNoTrx, user5.length.toString())
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

