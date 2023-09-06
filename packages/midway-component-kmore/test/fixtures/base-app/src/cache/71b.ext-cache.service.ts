import assert from 'node:assert/strict'

import {
  Config as _Config,
  Inject,
} from '@midwayjs/core'
import { CacheManager, CacheConfigKey, initConfig } from '@mwcp/cache'

import { Transactional } from '../../../../../dist/index.js'

import { validateMeta } from './70.helper.js'
import { UserRepo8 } from './71c.ext-cache.repo.js'


@Transactional()
export class UserService {

  name = 'UserService'

  @Inject() cacheManager: CacheManager
  @Inject() repo8: UserRepo8

  async withCacheableAfter(): Promise<void> {
    const uid = 1

    const ret = await this.repo8.getUserByUidWithCacheableAfter(uid)
    const [user] = ret
    assert(user && user.uid)
    // @ts-ignore
    assert(! ret[CacheConfigKey.CacheMetaType])

    const cacheKey = `${this.repo8.name}.getUserByUidWithCacheableAfter:${uid}`
    const ret2 = await this.repo8.getUserByUidWithCacheableAfter(uid)
    const [user2] = ret2
    assert(user2 && user2.uid)
    validateMeta(ret2, cacheKey, initConfig.options.ttl)
  }

  async withCacheableBefore(): Promise<void> {
    const uid = 1

    const ret = await this.repo8.getUserByUidWithCacheableBefore(uid)
    const [user] = ret
    assert(user && user.uid)
    // @ts-ignore
    assert(! user[CacheConfigKey.CacheMetaType])

    const cacheKey = `${this.repo8.name}.getUserByUidWithCacheableBefore:${uid}`
    const ret2 = await this.repo8.getUserByUidWithCacheableBefore(uid)
    const [user2] = ret2
    assert(user2 && user2.uid)
    validateMeta(ret2, cacheKey, initConfig.options.ttl)

    const ret3 = await this.repo8.getUserByUidWithCacheableBefore(uid)
    const [user3] = ret3
    assert(user3 && user2.uid)
    validateMeta(ret3, cacheKey, initConfig.options.ttl)
  }
}

