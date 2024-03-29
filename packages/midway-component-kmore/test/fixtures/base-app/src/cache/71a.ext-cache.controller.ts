import {
  Config as _Config,
  Controller,
  Get,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiPrefix, apiRoute } from '../api-route.js'

import { UserService } from './71b.ext-cache.service.js'


@Controller(apiPrefix.cache)
export class CacheController {

  @Inject() readonly ctx: Context
  @Inject() readonly userSvc: UserService


  @Get(`/${apiRoute.cacheableWithClassTransactional}`)
  async withCacheable(): Promise<'OK'> {
    await this.userSvc.withCacheableAfter()
    // await this.userSvc.withCacheableBefore()
    return 'OK'
  }


}

