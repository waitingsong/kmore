import assert from 'node:assert'

import {
  Controller,
  Get,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../../types/api-test.js'
import { Msg } from '../../types/index.js'

import { UserService } from './170s.fast_self_return_missing_await.service.js'


@Controller(apiPrefix.methodDecorator)
export class TrxDecoratorController {

  @Inject() protected readonly ctx: Context
  @Inject() protected readonly userSvc: UserService

  @Get(`/${apiRoute.fast_self_return_missing_await}`)
  async selfMissingAwait(): Promise<'OK'> {
    try {
      await this.userSvc.selfMissingAwait()
    }
    catch (ex) {
      assert(ex instanceof Error)
      assert(ex.message.includes(Msg.insufficientCallstacks), ex.message)
      return 'OK'
    }
    throw new Error('should not reach here')
  }

}

