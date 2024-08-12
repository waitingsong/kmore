import assert from 'node:assert'

import { Controller, Get, Inject, Param } from '@midwayjs/core'
import { Context } from '@mwcp/share'

import { apiBase, apiMethod } from '../../types/api-test.js'

import { TrxRepo } from './103r.trx-error.repo.js'


@Controller(apiBase.trx_error)
export class TrxController {

  @Inject() readonly ctx: Context
  @Inject() readonly repo: TrxRepo


  @Get(`/${apiMethod.close_early}/${apiMethod.rollback}/:id`)
  async rollback(@Param('id') uid: number): Promise<'OK'> {

    try {
      await this.repo.rollback(uid)
    }
    catch (ex) {
      assert(ex instanceof Error)
      const { message } = ex
      // message in package kmore
      assert(message.includes('Transaction already completed'), message)
      return 'OK'
    }

    throw new Error('should not reach here')
  }

  @Get(`/${apiMethod.close_early}/${apiMethod.commit}/:id`)
  async commit(@Param('id') uid: number): Promise<'OK'> {
    try {
      await this.repo.commit(uid)
    }
    catch (ex) {
      assert(ex instanceof Error)
      const { message } = ex
      // message in package kmore
      assert(message.includes('Transaction already completed'), message)
      return 'OK'
    }

    throw new Error('should not reach here')
  }

}

