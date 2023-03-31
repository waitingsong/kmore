/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import assert from 'node:assert'

import {
  Inject,
  Provide,
} from '@midwayjs/core'
import { TraceService, Trace } from '@mwcp/otel'
import type { Context } from '@mwcp/share'
import {
  Kmore,
  KmoreQueryBuilder,
  CtxBuilderPreProcessor,
  CtxBuilderResultPreProcessor,
  CtxBuilderResultPreProcessorOptions,
  CtxExceptionHandler,
  CtxExceptionHandlerOptions,
} from 'kmore'

import { DbSourceManager } from './db-source-manager'
import { genCallerKey } from './propagation/trx-status.helper'
import { proxyKnex, ProxyKnexOptions } from './proxy/db-manager.knex'
import { proxyRef, ProxyRefOptions } from './proxy/db-manager.ref'
import { knexKeys, refTableKeys } from './proxy/db-manager.types'
import { TrxStatusService } from './trx-status.service'


@Provide()
export class DbManager<SourceName extends string = string, D = unknown, Ctx extends Context = Context> {

  @Inject() readonly ctx: Ctx
  @Inject() readonly dbSourceManager: DbSourceManager<SourceName, D, Ctx>
  @Inject() readonly traceSvc: TraceService
  @Inject() readonly trxStatusSvc: TrxStatusService

  getName(): string { return 'dbManager' }

  instCacheMap: Map<SourceName, Kmore<any, Ctx>> = new Map()

  /**
   * Check the data source is connected
   */
  async isConnected(dataSourceName: SourceName): Promise<boolean> {
    return this.dbSourceManager.isConnected(dataSourceName)
  }


  @Trace<DbManager['getDataSource']>({
    startActiveSpan: false,
    spanName: ([dataSourceName]) => `dbManager.getDataSource(${dataSourceName})`,
  })
  getDataSource<Db = D>(dataSourceName: SourceName): Kmore<Db, Ctx> {

    // const event: Attributes = {
    //   event: KmoreAttrNames.getDataSourceStart,
    //   time: genISO8601String(),
    // }
    // this.traceSvc.addEvent(void 0, event)

    const cacheInst = this.instCacheMap.get(dataSourceName)
    if (cacheInst) {
      return cacheInst
    }

    const db = this.dbSourceManager.getDataSource<Db>(dataSourceName)
    assert(db, `db is empty: ${dataSourceName}`)

    const reqCtx: Ctx | undefined = this.ctx
    if (! reqCtx) {
      return db
    }

    const db3 = this.createProxy(db, reqCtx)
    this.instCacheMap.set(dataSourceName, db3)
    return db3
  }

  protected async builderPreProcessor(builder: KmoreQueryBuilder): ReturnType<CtxBuilderPreProcessor> {
    const ret = this.builderPropagating(builder)
    return ret
  }

  protected async builderPropagating(
    builder: KmoreQueryBuilder,
  ): ReturnType<CtxBuilderPreProcessor> {

    const { trxPropagateOptions } = builder
    if (! trxPropagateOptions) {
      return { builder }
    }

    if (builder.trxPropagated) {
      return { builder }
    }

    const kmore = this.getDataSource(builder.dbId as SourceName)
    const resp = await this.trxStatusSvc.propagating({ db: kmore, builder })
    return resp
  }

  protected async builderResultPreProcessor(
    options: CtxBuilderResultPreProcessorOptions,
  ): ReturnType<CtxBuilderResultPreProcessor> {

    if (options.kmoreTrxId && options.trxPropagated && options.trxPropagateOptions) {
      const { kmoreQueryId, rowLockLevel } = options
      if (rowLockLevel) {
        this.trxStatusSvc.updateBuilderSpanRowlockLevelTag(kmoreQueryId, rowLockLevel)
      }

      const { className, funcName } = options.trxPropagateOptions
      const callerKey = genCallerKey(className, funcName)
      assert(callerKey, 'callerKey is empty')
      const tkey = this.trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
      if (tkey !== callerKey) {
        await this.trxStatusSvc.trxCommitIfEntryTop(callerKey)
      }
    }

    return options.response
  }

  protected async exceptionHandler(
    options: CtxExceptionHandlerOptions,
  ): ReturnType<CtxExceptionHandler> {

    if (options.trxPropagated && options.trxPropagateOptions) {
      const { kmoreQueryId, rowLockLevel } = options
      if (rowLockLevel) {
        this.trxStatusSvc.updateBuilderSpanRowlockLevelTag(kmoreQueryId, rowLockLevel)
      }

      const { className, funcName } = options.trxPropagateOptions
      const callerKey = genCallerKey(className, funcName)
      assert(callerKey, 'callerKey is empty')
      const tkey = this.trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
      if (tkey !== callerKey) {
        await this.trxStatusSvc.trxRollbackEntry(callerKey)
      }
    }

    return Promise.reject(options.exception)
  }

  protected createProxy(db: Kmore, reqCtx: Ctx): Kmore<any, Ctx> {
    assert(reqCtx)

    if (! db.ctxTrxIdMap.has(reqCtx)) {
      db.ctxTrxIdMap.set(reqCtx, new Set())
    }

    const ret = new Proxy(db, {
      get: (target: Kmore, propKey: keyof Kmore) => {

        let resp: unknown

        if (refTableKeys.has(propKey)) {
          const opts: ProxyRefOptions = {
            ctxBuilderPreProcessor: this.builderPreProcessor.bind(this),
            ctxBuilderResultPreProcessor: this.builderResultPreProcessor.bind(this),
            ctxExceptionHandler: this.exceptionHandler.bind(this),
            // @ts-expect-error
            dbSourceManager: this.dbSourceManager,
            reqCtx,
            targetProperty: target[propKey],
            traceSvc: this.traceSvc,
            trxStatusSvc: this.trxStatusSvc,
          }
          resp = proxyRef(opts)
        }
        else if (knexKeys.has(propKey)) {
          const opts: ProxyKnexOptions = {
            // @ts-expect-error
            dbSourceManager: this.dbSourceManager,
            propKey,
            targetProperty: target[propKey],
            traceSvc: this.traceSvc,
          }
          resp = proxyKnex(opts)
        }
        else {
          resp = target[propKey]
        }

        return resp
      },
    })
    return ret
  }

}


