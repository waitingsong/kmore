import assert from 'node:assert'

import { Inject } from '@midwayjs/core'

import { Transactional, TrxPropagateOptions } from '../../types/index.js'
import type { UserDTO } from '../../types/test.model.js'

import { UserRepo4 } from './67c.cross.repo.js'
import { UserRepo5 } from './67d.cross.repo.js'


@Transactional()
export class UserService3 {

  name = 'UserService3'

  @Inject() repo4: UserRepo4
  @Inject() repo5: UserRepo5

  @Transactional()
  async userAll2(): Promise<void> {
    const [users, trx, trxPropagateOptions] = await this.repo4.getUsers()
    assert(users && users.length === 3)

    const [users5, trx5, trxPropagateOptions5] = await this.repo5.getUsers()
    assert(users5 && users5.length === 3)
    assert.deepEqual(users, users5)
    assert(trx === trx5)
    assert(trxPropagateOptions.entryKey === `${this.name}:userAll2`, trxPropagateOptions.entryKey)
    assert(
      trxPropagateOptions.entryKey === trxPropagateOptions5.entryKey,
      `${trxPropagateOptions.entryKey} !== ${trxPropagateOptions5.entryKey}`,
    )

    await this.getUsers2()

    const [users2, trx2] = await this.repo5.getUsers()
    assert(users2 && users2.length === 3)
    assert.deepEqual(users, users2)
    assert(trx === trx2)
  }

  async delete(): Promise<void> {
    const [users, trx, trxPropagateOptions] = await this.repo4.getUsers()
    assert(users && users.length === 3)

    await this.delUser(1)

    const [users4, trx4, trxPropagateOptions4] = await this.repo4.getUsers()
    assert(users4 && users4.length === 2)
    assert(trx === trx4)
    assert(
      trxPropagateOptions.entryKey === trxPropagateOptions4.entryKey,
      `${trxPropagateOptions.entryKey} !== ${trxPropagateOptions4.entryKey}`,
    )

    const [users5, trx5, trxPropagateOptions5] = await this.repo5.getUsers()
    assert(users5 && users5.length === 2)
    assert.deepEqual(users4, users5)
    assert(trx === trx5)
    assert(trxPropagateOptions.entryKey === `${this.name}:delete`, trxPropagateOptions.entryKey)
    assert(
      trxPropagateOptions.entryKey === trxPropagateOptions5.entryKey,
      `${trxPropagateOptions.entryKey} !== ${trxPropagateOptions5.entryKey}`,
    )

    await this.getUsers2(2)
  }


  async userAll(): Promise<void> {
    const [users, trx] = await this.repo5.getUsers()
    assert(users && users.length === 3)

    await this.getUsers2(3)

    const [users2, trx2] = await this.repo4.getUsers()
    assert(users2 && users2.length === 3)
    assert(trx === trx2)
  }

  async getUsers(): Promise<[UserDTO[], symbol, TrxPropagateOptions]> {
    const ret = await this.repo4.getUsers()
    const ret5 = await this.repo5.getUsers()
    assert.deepEqual(ret[0], ret5[0])
    assert(ret[1] === ret5[1])
    assert(ret[2].entryKey === ret5[2].entryKey)
    return ret
  }

  async getUserByUid(uid: UserDTO['uid']): Promise<[UserDTO | undefined, symbol, TrxPropagateOptions]> {
    const ret = await this.repo4.getUserByUid(uid)
    const ret5 = await this.repo5.getUserByUid(uid)
    assert.deepEqual(ret[0], ret5[0])
    assert(ret[1] === ret5[1])
    assert(
      ret[2].entryKey === ret5[2].entryKey,
      `${ret[2].entryKey} !== ${ret5[2].entryKey}`,
    )
    return ret
  }


  async getUsers2(expectTotal = 3): Promise<UserDTO[]> {
    const ret = await this.repo4.getUsers2(expectTotal)
    const ret5 = await this.repo5.getUsers2(expectTotal)
    assert.deepEqual(ret, ret5)
    return ret
  }

  // async userAllWithUpdate(): Promise<void> {
  //   const ret = await this.repo4.userAllWithUpdate()
  //   return ret
  // }

  async updateUser(uid: UserDTO['uid'], realName: UserDTO['realName']): Promise<UserDTO> {
    const ret = await this.repo5.updateUser(uid, realName)
    return ret
  }

  async delUser(uid: UserDTO['uid']): Promise<UserDTO> {
    const [user, trx, trxPropagateOptions] = await this.getUserByUid(uid)
    const [ret, trx1, trxPropagateOptions1] = await this.repo4.delUser(uid)
    assert.deepEqual(ret, user)
    assert(trx === trx1)
    assert(
      trxPropagateOptions.entryKey === trxPropagateOptions1.entryKey,
      `${trxPropagateOptions.entryKey} !== ${trxPropagateOptions1.entryKey}`,
    )

    const [user2, trx2, trxPropagateOptions2] = await this.getUserByUid(uid)
    assert(! user2)
    assert(trx === trx2)
    assert(
      trxPropagateOptions.entryKey === trxPropagateOptions2.entryKey,
      `${trxPropagateOptions.entryKey} !== ${trxPropagateOptions2.entryKey}`,
    )
    return ret
  }

  async delUserAll(): Promise<UserDTO> {
    const ret = await this.repo5.delUserAll()
    return ret
  }


  // NOTE: .forShare() will not be append with aggregate function!
  async countUser(): Promise<[number, symbol, TrxPropagateOptions]> {
    const ret = await this.repo4.countUser()
    const ret5 = await this.repo5.countUser()
    assert(ret[0] === ret5[0])
    assert(ret[1] === ret5[1])
    return ret
  }

}

