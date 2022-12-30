import assert from 'node:assert/strict'

import {
  Config as _Config,
  Inject,
} from '@midwayjs/core'
import { CacheConfigKey, CacheManager } from '@mwcp/cache'

import {
  Transactional, TrxPropagateOptions,
} from '~/index'
import type { UserDTO } from '@/test.model'
import { UserRepo6 } from './70c.cache.repo'
import { UserRepo7 } from './70d.cache.repo'
import { validateMeta } from './70.helper'


@Transactional()
export class UserService {

  name = 'UserService'

  @Inject() cacheManager: CacheManager
  @Inject() repo6: UserRepo6
  @Inject() repo7: UserRepo7

  @Transactional()
  async userAll2(): Promise<void> {
    const [users, trx, trxPropagateOptions] = await this.repo6.getUsers()
    assert(users && users.length === 3)

    const [users5, trx5, trxPropagateOptions5] = await this.repo7.getUsers()
    assert(users5 && users5.length === 3)
    assert.deepEqual(users, users5)
    assert(trx === trx5)
    assert(trxPropagateOptions.entryKey === `${this.name}:userAll2`, trxPropagateOptions.entryKey)
    assert(
      trxPropagateOptions.entryKey === trxPropagateOptions5.entryKey,
      `${trxPropagateOptions.entryKey} !== ${trxPropagateOptions5.entryKey}`,
    )

    await this.getUsers2()
  }

  async delete(): Promise<void> {
    this.cacheManager.reset()

    const ret = await this.repo6.getUsers()
    const [users, trx, trxPropagateOptions] = ret
    assert(users && users.length === 3)
    // @ts-ignore
    assert(! ret[CacheConfigKey.CacheMetaType])

    await this.delUser(1)

    const cacheKey = `${this.repo6.name}.getUsers`
    const ret2 = await this.repo6.getUsers()
    const [users4, trx4, trxPropagateOptions4] = ret2
    assert(users4 && users4.length === 2)
    assert(trx === trx4)
    assert(
      trxPropagateOptions.entryKey === trxPropagateOptions4.entryKey,
      `${trxPropagateOptions.entryKey} !== ${trxPropagateOptions4.entryKey}`,
    )
    // @ts-ignore
    assert(! ret[CacheConfigKey.CacheMetaType])

    const ret3 = await this.repo6.getUsers()
    validateMeta(ret3, cacheKey, 10)
  }


  async userAll(): Promise<void> {
    const [users, trx] = await this.repo7.getUsers()
    assert(users && users.length === 3)

    await this.getUsers2(3)

    const [users2, trx2] = await this.repo6.getUsers()
    assert(users2 && users2.length === 3)
    assert(trx === trx2)
  }

  async getUsers(): Promise<[UserDTO[], symbol, TrxPropagateOptions]> {
    const ret = await this.repo6.getUsers()
    const ret5 = await this.repo7.getUsers()
    assert.deepEqual(ret[0], ret5[0])
    assert(ret[1] === ret5[1])
    assert(ret[2].entryKey === ret5[2].entryKey)
    return ret
  }

  async getUserByUid(uid: UserDTO['uid']): Promise<[UserDTO | undefined, symbol, TrxPropagateOptions]> {
    const ret = await this.repo6.getUserByUid(uid)
    const ret7 = await this.repo7.getUserByUid(uid)
    assert.deepEqual(ret[0], ret7[0])
    assert(ret[1] === ret7[1])
    assert(
      ret[2].entryKey === ret7[2].entryKey,
      `${ret[2].entryKey} !== ${ret7[2].entryKey}`,
    )
    return ret
  }


  async getUsers2(expectTotal = 3): Promise<UserDTO[]> {
    const cacheKey6 = `${this.repo6.name}.getUsers2`
    const ret = await this.repo6.getUsers2(expectTotal)
    // @ts-ignore
    assert(! ret[CacheConfigKey.CacheMetaType])
    const reta = await this.repo6.getUsers2(expectTotal)
    validateMeta(reta, cacheKey6, 10)

    const ret7 = await this.repo7.getUsers2(expectTotal)
    // @ts-ignore
    assert(! ret7[CacheConfigKey.CacheMetaType])
    const ret7a = await this.repo7.getUsers2(expectTotal)
    // @ts-ignore
    assert(! ret7a[CacheConfigKey.CacheMetaType])

    assert.deepEqual(ret, ret7)
    return ret
  }

  // async userAllWithUpdate(): Promise<void> {
  //   const ret = await this.repo4.userAllWithUpdate()
  //   return ret
  // }

  async updateUser(uid: UserDTO['uid'], realName: UserDTO['realName']): Promise<UserDTO> {
    const ret = await this.repo7.updateUser(uid, realName)
    return ret
  }

  @Transactional<UserRepo6['getUsers']>(void 0, void 0, {
    op: 'CacheEvict',
    cacheName: 'UserRepo6.getUsers',
  })
  async delUser(uid: UserDTO['uid']): Promise<UserDTO> {
    const [user, trx, trxPropagateOptions] = await this.getUserByUid(uid)
    const [ret, trx1, trxPropagateOptions1] = await this.repo6.delUser(uid)
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
    const ret = await this.repo7.delUserAll()
    return ret
  }


  // NOTE: .forShare() will not be append with aggregate function!
  async countUser(): Promise<[number, symbol, TrxPropagateOptions]> {
    const ret = await this.repo6.countUser()
    const ret5 = await this.repo7.countUser()
    assert(ret[0] === ret5[0])
    assert(ret[1] === ret5[1])
    return ret
  }

}

