import { Controller, Get, Inject, Param } from '@midwayjs/core'

import { apiBase, apiMethod } from '../../types/api-test.js'

import { TrxRepo } from './101r.middle-trx-auto-action.repo.js'


@Controller(apiBase.middle_trx_auto_action)
export class Trx101Controller {

  @Inject() readonly repo: TrxRepo

  @Get(`/${apiMethod.commit}/:id`)
  async commit(@Param('id') uid: number): Promise<'OK'> {
    await this.repo.commit(uid)
    return 'OK'
  }

}

