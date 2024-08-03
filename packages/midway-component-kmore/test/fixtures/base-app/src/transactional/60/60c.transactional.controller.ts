import { Controller, Get, Inject } from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../../types/api-test.js'
import {
  PropagationType,
  Transactional,
} from '../../types/index.js'

import { TrxDecoratorRepo } from './60r.transactional.repo.js'


@Controller(apiPrefix.methodDecorator)
export class TrxDecoratorController {

  @Inject() readonly ctx: Context
  @Inject() readonly repo: TrxDecoratorRepo

  @Transactional({ propagationType: PropagationType.REQUIRED })
  @Get(`/${apiRoute.simple}`)
  async simple(): Promise<'OK'> {
    const ret = this.repo.simple()
    return ret
  }

}

