import assert from 'node:assert/strict'

import {
  Config as _Config,
  Init,
  Inject,
  Provide,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import {
  DbManager,
  Kmore,
  Transactional,
} from '~/index'
import type { Db, UserDTO } from '@/test.model'


@Provide()
export class UserService {

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
  async userAll(): Promise<void> {
    const users = await this.getUsers()
    assert(users && users.length === 3)

    await this.getUsers2()

    const users2 = await this.getUsers()
    assert(users2 && users2.length === 3)
  }

  @Transactional()
  async getUsers(): Promise<UserDTO[]> {
    const users = await this.ref_tb_user()
    assert(users)
    return users
  }

  @Transactional()
  async getUserByUid(uid: UserDTO['uid']): Promise<UserDTO> {
    const user = await this.ref_tb_user()
      .where({ uid })
      .first()
    assert(user)
    return user
  }

  async getUsersNoTrx(): Promise<UserDTO[]> {
    const users = await this.ref_tb_user()
    assert(users)
    return users
  }

  @Transactional()
  async getUsers2(): Promise<UserDTO[]> {
    const users = await this.db.camelTables.ref_tb_user()
    assert(users && users.length === 3)
    return users
  }

  @Transactional()
  async userAllWithUpdate(): Promise<void> {
    const [user] = await this.getUsers()
    assert(user && user.realName !== 'test')

    const uid = 1
    const realName = 'test' + Math.random().toString()
    const user2 = await this.updateUser(uid, realName)
    assert(user2.realName === realName)

    const users3 = await this.getUsers()
    assert(users3 && users3.length === 3)
    users3.forEach(row => {
      if (row.uid === uid) {
        assert(row.realName === realName)
      }
      else {
        assert(row.realName !== realName)
      }
    })
  }

  @Transactional()
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

  @Transactional()
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

  @Transactional()
  async delUserAll(): Promise<UserDTO> {
    return this.ref_tb_user().del()
  }

  @Transactional()
  async userUpdateDel(
    uid: UserDTO['uid'],
    expectTotal: number,
    expectTotalNoTrx: number,
  ): Promise<void> {

    const total0 = await this.countUser()
    assert(total0 === expectTotal)

    const user = await this.getUserByUid(uid)
    assert(user, 'user not found')
    const name = 'rn' + uid.toString()
    assert(user.realName === name, JSON.stringify(user) + ' vs ' + name)

    const realName = 'test' + Math.random().toString()
    const user2 = await this.updateUser(uid, realName)
    assert(user2.realName === realName)

    const user3 = await this.getUsers()
    user3.forEach(row => {
      if (row.uid === uid) {
        assert(row.realName === realName)
      }
    })

    const user4 = await this.delUser(uid)
    assert(user4.uid === uid)
    assert(user4.realName === realName)

    const total1 = await this.countUserNoTrx()
    assert(
      total1 === expectTotalNoTrx,
      `uid: ${uid}, total (wo trx): ${total1.toString()}, expectTotalNoTrx: ${expectTotalNoTrx}`
      )

    // NOTE: .forShare() will not be append with aggregate function!
    const total2 = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())

    const user5 = await this.getUsersNoTrx()
    assert(user5.length === expectTotalNoTrx, user5.length.toString())

    const user6 = await this.getUsers()
    assert(user6.length === expectTotal - 1 , user6.length.toString())
  }


  async countUserNoTrx(): Promise<number> {
    const total = await this.ref_tb_user()
      .count({ total: '*' })
      .then(rows => rows[0]?.total)
      .then(resp => resp ? +resp : 0)

    // const users = await this.ref_tb_user().then()
    // void users

    return total
  }

  // NOTE: .forShare() will not be append with aggregate function!
  @Transactional()
  async countUser(): Promise<number> {
    const total = await this.ref_tb_user()
      .count({ total: '*' })
      .then(rows => rows[0]?.total)
      .then(resp => resp ? +resp : 0)

    return total
  }

  @Transactional()
  async userUpdateDelAll(): Promise<void> {
    await this.userUpdateDel(1, 3, 3)
    await this.delUserAll()

    const total1 = await this.countUserNoTrx()
    assert(total1 > 0, total1.toString())

    // NOTE: .forShare() will not be append with aggregate function!
    const total2 = await this.countUser()
    assert(total2 === 0, total2.toString())

    const user5 = await this.getUsersNoTrx()
    assert(user5.length > 0, user5.length.toString())

    const user6 = await this.getUsers()
    assert(user6.length === 0, user6.length.toString())
  }

  @Transactional()
  async truncateTbUser(): Promise<void> {
    await this.ref_tb_user().truncate()
  }


  @Transactional()
  async selfUserUpdateDel(
    uid: UserDTO['uid'],
    expectTotal: number,
    expectTotalNoTrx: number,
  ): Promise<void> {

    const total0 = await this.countUser()
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

    const user3 = await this.getUsers()
    user3.forEach(row => {
      if (row.uid === uid) {
        assert(row.realName === realName)
      }
    })

    const user4 = await this.delUser(uid)
    assert(user4.uid === uid)
    assert(user4.realName === realName)

    const total1 = await this.countUserNoTrx()
    assert(total1 === expectTotalNoTrx, `${total1.toString()}, ${expectTotalNoTrx}`)

    // NOTE: .forShare() will not be append with aggregate function!
    const total2 = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())

    const user5 = await this.getUsersNoTrx()
    assert(user5.length === expectTotalNoTrx, user5.length.toString())

    const user6 = await this.getUsers()
    assert(user6.length === expectTotal - 1 , user6.length.toString())

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

    const total0 = await this.countUser()
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

    const total1 = await this.countUserNoTrx()
    assert(total1 === expectTotalNoTrx, `${total1.toString()}, ${expectTotalNoTrx}`)

    // NOTE: .forShare() will not be append with aggregate function!
    const total2 = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())

    const user5 = await this.getUsersNoTrx()
    assert(user5.length === expectTotalNoTrx, user5.length.toString())

    const user6 = await this.getUsers()
    assert(user6.length === expectTotal - 1 , user6.length.toString())

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

    const total0 = await this.countUser()
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

    const total1 = await this.countUserNoTrx()
    assert(total1 === expectTotalNoTrx, `${total1.toString()}, ${expectTotalNoTrx}`)

    // NOTE: .forShare() will not be append with aggregate function!
    const total2 = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())

    const user5 = await this.getUsersNoTrx()
    assert(user5.length === expectTotalNoTrx, user5.length.toString())

    const user6 = await this.getUsers()
    assert(user6.length === expectTotal - 1 , user6.length.toString())

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

    const total0 = await this.countUser()
    assert(total0 === expectTotal)

    const user4 = await this.delUser(uid)
    assert(user4.uid === uid)

    const total2 = await this.countUser()
    assert(total2 === expectTotal - 1, total2.toString())

    const user5 = await this.getUsersNoTrx()
    assert(user5.length === expectTotalNoTrx, user5.length.toString())
  }
}

