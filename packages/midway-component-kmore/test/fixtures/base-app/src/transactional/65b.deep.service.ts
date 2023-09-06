import assert from 'node:assert/strict'

import {
  Config as _Config,
  Inject,
} from '@midwayjs/core'


import {
  DbManager,
  Transactional,
} from '../../../../../dist/index.js'
import type { Db, UserDTO } from '../../../../test.model.js'

import { UserRepo3 } from './65c.deep.repo.js'


@Transactional()
export class UserService3 {

  name = 'UserService3'

  @Inject() dbManager: DbManager<'master', Db>
  @Inject() repo3: UserRepo3

  @Transactional()
  async userAll2(): Promise<void> {
    const [users, trx] = await this.repo3.getUsers()
    assert(users && users.length === 3)

    await this.getUsers2()

    const [users2, trx2] = await this.repo3.getUsers()
    assert(users2 && users2.length === 3)
    assert(trx === trx2)
  }


  async userAll(): Promise<void> {
    const [users, trx] = await this.repo3.getUsers()
    assert(users && users.length === 3)

    await this.getUsers2()

    const [users2, trx2] = await this.repo3.getUsers()
    assert(users2 && users2.length === 3)
    assert(trx === trx2)
  }

  async getUsers(): Promise<[UserDTO[], symbol]> {
    const ret = await this.repo3.getUsers()
    return ret
  }

  async getUserByUid(uid: UserDTO['uid']): Promise<UserDTO> {
    const ret = await this.repo3.getUserByUid(uid)
    return ret
  }


  async getUsers2(): Promise<UserDTO[]> {
    const ret = await this.repo3.getUsers2()
    return ret
  }

  async userAllWithUpdate(): Promise<void> {
    const ret = await this.repo3.userAllWithUpdate()
    return ret
  }

  async updateUser(uid: UserDTO['uid'], realName: UserDTO['realName']): Promise<UserDTO> {
    const ret = await this.repo3.updateUser(uid, realName)
    return ret
  }

  async delUser(uid: UserDTO['uid']): Promise<UserDTO> {
    const ret = await this.repo3.delUser(uid)
    return ret
  }

  async delUserAll(): Promise<UserDTO> {
    const ret = await this.repo3.delUserAll()
    return ret
  }

  async userUpdateDel(
    uid: UserDTO['uid'],
    expectTotal: number,
  ): Promise<void> {

    const ret = await this.repo3.userUpdateDel(uid, expectTotal)
    return ret
  }


  // NOTE: .forShare() will not be append with aggregate function!
  async countUser(): Promise<[number, symbol]> {
    const ret = await this.repo3.countUser()
    return ret
  }

  async userUpdateDelAll(): Promise<void> {
    const ret = await this.repo3.userUpdateDelAll()
    return ret
  }

  async truncateTbUser(): Promise<void> {
    const ret = await this.repo3.truncateTbUser()
    return ret
  }


  async selfUserUpdateDel(
    uid: UserDTO['uid'],
    expectTotal: number,
    expectTotalNoTrx: number,
  ): Promise<void> {

    const ret = await this.repo3.selfUserUpdateDel(uid, expectTotal, expectTotalNoTrx)
    return ret
  }

}

