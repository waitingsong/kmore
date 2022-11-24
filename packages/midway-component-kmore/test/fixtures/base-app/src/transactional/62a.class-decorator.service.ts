import assert from 'node:assert/strict'

import {
  Config as _Config,
  Init,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import {
  DbManager,
  Kmore,
  Transactional,
} from '~/index'
import type { Db, UserDTO } from '@/test.model'
import { KmoreQueryBuilder } from 'kmore'


@Transactional()
export class UserService2 {

  name = 'UserService2'

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

  async getUsers(): Promise<[UserDTO[], symbol]> {
    const builder = this.ref_tb_user()
    const users = await builder
    const trxId = this.validateBuilderLinkedTrx(builder) // must after "await"
    assert(users)
    return [users, trxId]
  }

  async getUserByUid(uid: UserDTO['uid']): Promise<UserDTO> {
    const user = await this.ref_tb_user()
      .where({ uid })
      .first()
    assert(user)
    return user
  }


  async getUsers2(): Promise<UserDTO[]> {
    const users = await this.db.camelTables.ref_tb_user()
    assert(users && users.length === 3)
    return users
  }

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
    users3.forEach(row => {
      if (row.uid === uid) {
        assert(row.realName === realName)
      }
      else {
        assert(row.realName !== realName)
      }
    })
    assert(trx === trx3)
  }

  async updateUser(uid: UserDTO['uid'], realName: UserDTO['realName']): Promise<UserDTO> {
    assert(uid)
    assert(realName)

    const user = await this.ref_tb_user()
      .where({ uid })
      .update({ realName })
      .returning('*')
      .then(rows => rows[0])

    assert(user)
    assert(user.uid === uid)
    assert(user.realName === realName)
    return user
  }

  async delUser(uid: UserDTO['uid']): Promise<UserDTO> {
    assert(uid)

    const user = await this.ref_tb_user()
      .where({ uid })
      .del()
      .returning('*')
      .then(rows => rows[0])

    assert(user)
    assert(user.uid === uid)
    return user
  }

  async delUserAll(): Promise<UserDTO> {
    return this.ref_tb_user().del()
  }

  async userUpdateDel(
    uid: UserDTO['uid'],
    expectTotal: number,
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
    user3.forEach(row => {
      if (row.uid === uid) {
        assert(row.realName === realName)
      }
    })
    assert(trx0 === trx3)

    const user4 = await this.delUser(uid)
    assert(user4.uid === uid)
    assert(user4.realName === realName)


    // NOTE: .forShare() will not be append with aggregate function!
    const [total2, trx2] = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())
    assert(trx0 === trx2)

    const [user6, trx6] = await this.getUsers()
    assert(user6.length === expectTotal - 1 , user6.length.toString())
    assert(trx3 === trx6)
  }


  // NOTE: .forShare() will not be append with aggregate function!
  async countUser(): Promise<[number, symbol]> {
    const builder = this.ref_tb_user()
    const trxId = this.validateBuilderLinkedTrx(builder)
    const total = await builder
      .count({ total: '*' })
      .then(rows => rows[0]?.total)
      .then(resp => resp ? +resp : 0)

    return [total, trxId]
  }

  async userUpdateDelAll(): Promise<void> {
    await this.userUpdateDel(1, 3)
    await this.delUserAll()

    // NOTE: .forShare() will not be append with aggregate function!
    const [total2, trx2] = await this.countUser()
    assert(total2 === 0, total2.toString())

    const [user6, trx6] = await this.getUsers()
    assert(user6.length === 0, user6.length.toString())
    assert(trx2 === trx6)
  }

  async truncateTbUser(): Promise<void> {
    await this.ref_tb_user().truncate()
  }


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
    user3.forEach(row => {
      if (row.uid === uid) {
        assert(row.realName === realName)
      }
    })
    assert(trx0 === trx3)

    const user4 = await this.delUser(uid)
    assert(user4.uid === uid)
    assert(user4.realName === realName)

    // NOTE: .forShare() will not be append with aggregate function!
    const [total2, trx2] = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())
    assert(trx0 === trx2)

    const [user6, trx6] = await this.getUsers()
    assert(user6.length === expectTotal - 1 , user6.length.toString())
    assert(trx0 === trx6)

    if (total2 > 0) {
      await this.selfUserUpdateDel(uid + 1, expectTotal - 1, expectTotalNoTrx)
    }
    else {
      return
    }
  }

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

    const user4 = await this.delUser(uid)
    assert(user4.uid === uid)

    // NOTE: .forShare() will not be append with aggregate function!
    const [total2, trx2] = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())
    assert(trx0 === trx2)

    const [user6, trx6] = await this.getUsers()
    assert(user6.length === expectTotal - 1 , user6.length.toString())
    assert(trx0 === trx6)

    if (total2 > 0) {
      // Debug: no await
      void this.selfMissingAwait(uid + 1, expectTotal - 1, expectTotalNoTrx)
    }
    else {
      return
    }
  }

  async selfReturnPromise(
    uid: UserDTO['uid'],
    expectTotal: number,
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

    const user4 = await this.delUser(uid)
    assert(user4.uid === uid)

    // NOTE: .forShare() will not be append with aggregate function!
    const [total2, trx2] = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())
    assert(trx0 === trx2)

    const [user6, trx6] = await this.getUsers()
    assert(user6.length === expectTotal - 1 , user6.length.toString())
    assert(trx0 === trx6)

    if (total2 > 0) {
      return this.selfReturnPromise(uid + 1, expectTotal - 1)
    }
    else {
      return
    }
  }

  async throwError(
    uid: UserDTO['uid'],
    expectTotal: number,
  ): Promise<void> {

    await this._del(uid, expectTotal)
    throw new Error('test error for throwError')
  }

  async returnReject(
    uid: UserDTO['uid'],
    expectTotal: number,
  ): Promise<void> {

    await this._del(uid, expectTotal)
    return Promise.reject(new Error('test error for returnReject'))
  }


  protected async _del(
    uid: UserDTO['uid'],
    expectTotal: number,
  ): Promise<void> {

    const [total0, trx0] = await this.countUser()
    assert(total0 === expectTotal)

    const user4 = await this.delUser(uid)
    assert(user4.uid === uid)

    const [total2, trx2] = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())
    assert(trx0 === trx2)
  }


  protected validateBuilderLinkedTrx(builder: KmoreQueryBuilder<Db>): symbol {
    const { kmoreQueryId } = builder
    const trx = this.db.getTrxByKmoreQueryId(kmoreQueryId)
    assert(trx, 'trx not found')
    const  { kmoreTrxId } = trx
    assert(kmoreTrxId, 'kmoreTrxId not found')
    return kmoreTrxId
  }
}

