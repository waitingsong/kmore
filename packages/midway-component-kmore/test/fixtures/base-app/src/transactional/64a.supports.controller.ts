import assert from 'node:assert/strict'

import {
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
} from '../../../../../dist/index.js'
import { apiBase as apiPrefix, apiMethod as apiRoute } from '../../../../api-test.js'
import type { Db } from '../../../../test.model.js'

import { PropagationOverrideService } from './64a.supports.service.js'


@Controller(apiPrefix.propagationOverride)
export class TrxDecoratorOverrideController {

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>
  @Inject() userSvc: PropagationOverrideService

  ref_tb_user: Kmore<Db, Context>['camelTables']['ref_tb_user']
  ref_tb_user_ext: Kmore<Db, Context>['camelTables']['ref_tb_user_ext']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)
    this.ref_tb_user = db.camelTables.ref_tb_user
    this.ref_tb_user_ext = db.camelTables.ref_tb_user_ext
  }

  @Transactional(PropagationType.SUPPORTS)
  @Get(`/${apiRoute.simple}`)
  async simple(): Promise<'OK'> {
    const builder = this.ref_tb_user()
    const { kmoreQueryId, trxPropagated, trxPropagateOptions } = builder
    assert(kmoreQueryId)
    assert(! trxPropagated)
    assert(trxPropagateOptions)
    assert(trxPropagateOptions.type === PropagationType.SUPPORTS)

    const users = await builder.then()
    assert(users && users.length === 3)
    assert(! builder.trxPropagated)

    const ret = this._simple()
    return ret
  }

  @Get(`/${apiRoute.supports}`)
  async supports(): Promise<'OK'> {
    const {
      users,
      trxId,
      trxPropagateOptions,
      trxPropagated,
    } = await this.userSvc.getUsersWithMethodDecoratorSupports(false)
    assert(users && users.length === 3)
    assert(! trxId)
    assert(trxPropagateOptions)
    assert(trxPropagateOptions.type === PropagationType.SUPPORTS)
    assert(! trxPropagated)

    return 'OK'
  }

  @Get(`/${apiRoute.supports2}`)
  async supports2(): Promise<'OK'> {
    await this.userSvc.usersAll()
    return 'OK'
  }

  protected _simple(): 'OK' {
    return 'OK'
  }

}

