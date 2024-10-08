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

import { PropagationOverrideService } from './64s.supports.service.js'


@Controller(apiPrefix.propagationOverride)
export class TrxDecoratorOverrideController {

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>
  @Inject() userSvc: PropagationOverrideService

  tb_user: Kmore<Db>['camelTables']['tb_user']
  tb_user_ext: Kmore<Db>['camelTables']['tb_user_ext']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)
    this.tb_user = db.camelTables.tb_user
    this.tb_user_ext = db.camelTables.tb_user_ext
  }

  @Transactional({ propagationType: PropagationType.SUPPORTS })
  @Get(`/${apiRoute.simple}`)
  async simple(): Promise<'OK'> {
    const builder = this.tb_user()
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

