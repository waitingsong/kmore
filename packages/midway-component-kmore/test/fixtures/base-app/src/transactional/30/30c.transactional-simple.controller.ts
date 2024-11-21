import { Controller, Get, Inject } from '@midwayjs/core'
import { TraceService } from '@mwcp/otel'
import type { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../../types/api-test.js'

import { TransactionalSimpleRepo } from './30r.transactional-simple.repo.js'


@Controller(apiPrefix.transactional_simple)
export class TransactionalSimpleController {

  @Inject() readonly ctx: Context
  @Inject() readonly traceSvc: TraceService
  @Inject() readonly repo: TransactionalSimpleRepo

  @Get(`/${apiRoute.simple}`)
  async simple(): Promise<string> {
    const traceId = this.traceSvc.getTraceId()
    await this.repo.user()
    return traceId
  }

  @Get(`/${apiRoute.hello}`)
  async hello(): Promise<string> {
    const traceId = this.traceSvc.getTraceId()
    await this.repo.userAll()
    return traceId
  }

}

