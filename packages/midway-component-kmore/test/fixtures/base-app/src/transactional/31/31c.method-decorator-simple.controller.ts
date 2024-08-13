import { Controller, Get, Inject } from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../../types/api-test.js'

import { UserRepo } from './31r.method-decorator-simple.repo.js'


@Controller(apiPrefix.decorator)
export class TrxDecoratorController {

  @Inject() readonly ctx: Context
  @Inject() readonly repo: UserRepo

  @Get(`/${apiRoute.simple}`)
  async simple(): Promise<'OK'> {
    await this.repo.userAll()
    return 'OK'
  }

}

