import {
  Config as _Config,
  Controller,
  Get,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiPrefix, apiRoute } from '../api-route'
import { UserService } from './70b.cache.service'


@Controller(apiPrefix.cache)
export class CacheController {

  @Inject() readonly ctx: Context
  @Inject() readonly userSvc: UserService


  @Get(`/${apiRoute.get}`)
  async get(): Promise<'OK'> {
    await this.userSvc.userAll2()
    return 'OK'
  }

  @Get(`/${apiRoute.delete}`)
  async delete(): Promise<'OK'> {
    await this.userSvc.delete()
    return 'OK'
  }

}

