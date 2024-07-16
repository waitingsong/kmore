import {
  Controller,
  Get,
  Inject,
} from '@midwayjs/core'
import { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../types/api-test.js'

import { UserService } from './70b.cache.service.js'


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

