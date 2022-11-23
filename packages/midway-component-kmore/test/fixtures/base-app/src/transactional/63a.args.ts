import assert from 'node:assert/strict'

import {
  Config as _Config,
  Controller,
  Get,
  Init,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import {
  DbManager,
  Kmore,
  PropagationType,
  Transactional,
} from '~/index'
import type { Db } from '@/test.model'
import { apiPrefix, apiRoute } from '../api-route'


@Controller(apiPrefix.args)
@Transactional()
export class TrxDecoratorArgsController {

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  ref_tb_user: Kmore<Db, Context>['camelTables']['ref_tb_user']
  ref_tb_user_ext: Kmore<Db, Context>['camelTables']['ref_tb_user_ext']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)
    this.ref_tb_user = db.camelTables.ref_tb_user
    this.ref_tb_user_ext = db.camelTables.ref_tb_user_ext
  }

  @Transactional(PropagationType.REQUIRED)
  @Get(`/${apiRoute.simple}`)
  async simple(): Promise<'OK'> {

    const builder = this.ref_tb_user()
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

  @Transactional(PropagationType.SUPPORTS)
  async simple2(): Promise<'OK'> {
    const builder = this.ref_tb_user()
    const { kmoreQueryId, trxPropagated, trxPropagateOptions } = builder
    assert(kmoreQueryId)
    assert(! trxPropagated)
    assert(trxPropagateOptions)
    assert(trxPropagateOptions.type === PropagationType.SUPPORTS)
    return 'OK'
  }

  protected _simple(): 'OK' {
    return 'OK'
  }

}

