import { Controller, Get, Inject, Param } from '@midwayjs/core'
import { Context } from '@mwcp/share'

import { apiBase, apiMethod } from '../../types/api-test.js'

import { TrxRepo } from './100r.trx-manual.repo.js'


@Controller(apiBase.trx_manual)
export class Trx100Controller {

  @Inject() readonly ctx: Context
  @Inject() readonly repo: TrxRepo

  @Get(`/${apiMethod.commit}/:id`)
  async userAll(@Param('id') uid: number): Promise<'OK'> {
    await this.repo.userAll(uid)
    return 'OK'
  }

  @Get(`/${apiMethod.rollback}/:id`)
  async user(@Param('id') uid: number): Promise<'OK'> {
    await this.repo.user(uid)
    return 'OK'
  }

}

