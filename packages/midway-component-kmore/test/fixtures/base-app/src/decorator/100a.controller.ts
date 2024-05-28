import {
  Controller,
  Get,
  Inject,
} from '@midwayjs/core'
import { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../../../../api-test.js'

import { UserService100 } from './100b.service.js'


@Controller(apiPrefix.decorator)
export class CacheController {

  @Inject() readonly ctx: Context
  @Inject() readonly userSvc: UserService100

  @Get(`/${apiRoute.delete}`)
  async delete(): Promise<'OK'> {
    await this.userSvc.delete()
    return 'OK'
  }

}

