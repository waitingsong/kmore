import { Controller, Get, Inject } from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../../types/api-test.js'

import { UserService } from './160s.method-decorator-simple.service.js'


@Controller(apiPrefix.decorator)
export class TrxDecoratorController {

  @Inject() readonly ctx: Context
  @Inject() readonly userSvc: UserService

  @Get(`/${apiRoute.simple}`)
  async simple(): Promise<'OK'> {
    await this.userSvc.userAll()
    return 'OK'
  }

}

