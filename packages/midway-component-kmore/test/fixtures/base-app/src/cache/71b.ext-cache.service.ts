import assert from 'node:assert/strict'

import {
  Config as _Config,
  Inject,
} from '@midwayjs/core'
import { CacheManager, CacheConfigKey } from '@mwcp/cache'

import {
  Transactional,
} from '~/index'
import { UserRepo8 } from './71c.ext-cache.repo'
import { validateMeta } from './70.helper'


@Transactional()
export class UserService {

  name = 'UserService'

  @Inject() cacheManager: CacheManager
  @Inject() repo8: UserRepo8

  async withCacheableAfter(): Promise<void> {
    const user = await this.repo8.getUserByUidWithCacheableAfter(1)
    assert(user)
  }

  async withCacheableBefore(): Promise<void> {
    const user = await this.repo8.getUserByUidWithCacheableBefore(1)
    assert(user)
    // @ts-ignore
    assert(! user[CacheConfigKey.CacheMetaType])

    const cacheKey = `${this.repo8.name}.getUserByUidWithCacheableBefore`
    const user2 = await this.repo8.getUserByUidWithCacheableBefore(1)
    assert(user2)
    validateMeta(user2, cacheKey, 10)
  }
}

