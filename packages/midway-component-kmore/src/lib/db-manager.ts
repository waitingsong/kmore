/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import assert from 'node:assert'

import { Inject, Singleton } from '@midwayjs/core'
import { TraceService, SpanKind, Trace } from '@mwcp/otel'
import type { Kmore } from 'kmore'

import { DbSourceManager } from './db-source-manager.js'
import { TrxStatusService } from './trx-status.service.js'
import { ConfigKey } from './types.js'


@Singleton()
export class DbManager<SourceName extends string = string, D extends object = object> {

  @Inject() readonly dbSourceManager: DbSourceManager<SourceName, D>
  @Inject() readonly traceSvc: TraceService
  @Inject() readonly trxStatusSvc: TrxStatusService

  getName(): string { return 'dbManager' }

  instCacheMap = new Map<SourceName, Kmore>()

  /**
   * Check the data source is connected
   */
  async isConnected(dataSourceName: SourceName): Promise<boolean> {
    return this.dbSourceManager.isConnected(dataSourceName)
  }


  @Trace<DbManager['getDataSource']>({
    spanName: ([dataSourceName]) => `dbManager.getDataSource():${dataSourceName}`,
    startActiveSpan: false,
    kind: SpanKind.INTERNAL,
  })
  getDataSource<Db extends object = D>(dataSourceName: SourceName): Kmore<Db> {
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
    assert(db, `[${ConfigKey.componentName}] getDataSource() db source empty: "${dataSourceName}"`)

    // const reqCtx: Ctx | undefined = this.ctx
    // if (! reqCtx) {
    //   return db
    // }

    // const db3 = this.createProxy(db)
    this.instCacheMap.set(dataSourceName, db)
    return db
  }

  // #region protected methods

  // protected createProxy(db: Kmore): Kmore {

  //   // if (! db.ctxTrxIdMap.has(reqCtx)) {
  //   //   db.ctxTrxIdMap.set(reqCtx, new Set())
  //   // }

  //   const ret = new Proxy(db, {
  //     get: (target: Kmore, propKey: keyof Kmore) => {

  //       let resp: unknown

  //       if (refTableKeys.has(propKey)) {
  //         const opts: ProxyRefOptions = {
  //           // @ts-expect-error
  //           dbSourceManager: this.dbSourceManager,
  //           // reqCtx,
  //           targetProperty: target[propKey],
  //           traceSvc: this.traceSvc,
  //           trxStatusSvc: this.trxStatusSvc,
  //         }
  //         resp = proxyRef(opts)
  //       }
  //       else if (knexKeys.has(propKey)) {
  //         const opts: ProxyKnexOptions = {
  //           // @ts-expect-error
  //           dbSourceManager: this.dbSourceManager,
  //           propKey,
  //           targetProperty: target[propKey],
  //           traceSvc: this.traceSvc,
  //         }
  //         resp = proxyKnex(opts)
  //       }
  //       else {
  //         resp = target[propKey]
  //       }

  //       return resp
  //     },
  //   })
  //   return ret
  // }

}

