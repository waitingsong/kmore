import assert from 'node:assert/strict'

import {
  Config as _Config,
  Inject,
} from '@midwayjs/core'
import { CacheManager } from '@mwcp/cache'

import {
  Transactional,
} from '~/index'
import { UserRepo8 } from './71c.ext-cache.repo'


@Transactional()
export class UserService {

  name = 'UserService'

  @Inject() cacheManager: CacheManager
  @Inject() repo8: UserRepo8

  async withCacheableAfter(): Promise<void> {
    const user = await this.repo8.getUserByUidWithCacheableAfter(1)
    assert(user)
  }

}

