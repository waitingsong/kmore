import assert from 'node:assert'

import { Controller, Get, Init, Inject } from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../../types/api-test.js'
import {
  DbManager,
  Kmore,
  PropagationType,
  Transactional,
} from '../../types/index.js'
import type { Db } from '../../types/test.model.js'


@Controller(apiPrefix.args)
@Transactional()
export class TrxDecoratorArgsController {

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  tb_user: Kmore<Db>['camelTables']['tb_user']
  tb_user_ext: Kmore<Db>['camelTables']['tb_user_ext']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)
    this.tb_user = db.camelTables.tb_user
    this.tb_user_ext = db.camelTables.tb_user_ext
  }

  @Transactional({ propagationType: PropagationType.REQUIRED })
  @Get(`/${apiRoute.simple}`)
  async simple(): Promise<'OK'> {

    const builder = this.tb_user()
    const { kmoreQueryId, trxPropagated, trxPropagateOptions } = builder
    assert(kmoreQueryId)
    assert(! trxPropagated)
    assert(trxPropagateOptions)
    assert(trxPropagateOptions.type === PropagationType.REQUIRED)

    const users = await builder.then()
    assert(users && users.length === 3)
    assert(builder.trxPropagated === true)

    await this.simple2()

    const ret = this._simple()
    return ret
  }

  @Transactional({ propagationType: PropagationType.SUPPORTS })
  async simple2(): Promise<'OK'> {
    const builder = this.tb_user()
    const { kmoreQueryId, trxPropagated, trxPropagateOptions } = builder
    assert(kmoreQueryId)
    assert(! trxPropagated)
    assert(trxPropagateOptions)
    assert(
      trxPropagateOptions.type === PropagationType.SUPPORTS,
      `Expect ${PropagationType.SUPPORTS}, but got ${trxPropagateOptions.type}`,
    )
    return 'OK'
  }

  protected _simple(): 'OK' {
    return 'OK'
  }

}

