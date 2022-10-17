/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import assert from 'node:assert'
// import { isProxy } from 'node:util/types'

import {
  Inject,
  Provide,
} from '@midwayjs/decorator'
import { TraceService } from '@mwcp/otel'
import type { Context } from '@mwcp/share'
import { Kmore } from 'kmore'

import { knexKeys, ProxyOptions, proxyKnex, proxyRef, refTableKeys } from './db-manager.helper'
import { DbSourceManager } from './db-source-manager'


@Provide()
export class DbManager<SourceName extends string = string, D = unknown, Ctx extends Context = Context> {

  @Inject() readonly ctx: Ctx

  @Inject() dbSourceManager: DbSourceManager<SourceName, D, Ctx>
  @Inject() traceSvc: TraceService

  getName(): string { return 'dbManager' }

  instCacheMap: Map<SourceName, Kmore<any, Ctx>> = new Map()

  /**
   * Check the data source is connected
   */
  async isConnected(dataSourceName: SourceName): Promise<boolean> {
    return this.dbSourceManager.isConnected(dataSourceName)
  }


  getDataSource<Db = D>(dataSourceName: SourceName): Kmore<Db, Ctx> {
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

    const db2 = this.createProxy(db, reqCtx)
    if (db2) {
      this.instCacheMap.set(dataSourceName, db2)
    }
    return db2
  }

  protected createProxy(db: Kmore, reqCtx: Ctx): Kmore<any, Ctx> {
    assert(reqCtx)

    if (! db.ctxTrxIdMap.has(reqCtx)) {
      db.ctxTrxIdMap.set(reqCtx, new Set())
    }

    const ret = new Proxy(db, {
      get: (target: Kmore, propKey: keyof Kmore) => {
        const opts: ProxyOptions = {
          targetProperty: target[propKey],
          reqCtx,
          propKey,
          // @ts-expect-error
          dbSourceManager: this.dbSourceManager,
          traceSvc: this.traceSvc,
          func: target[propKey] as () => unknown,
        }

        if (refTableKeys.has(propKey)) {
          return proxyRef(opts)
        }

        if (this.traceSvc.isStarted && knexKeys.has(propKey)) {
          return proxyKnex(opts)
        }

        return target[propKey]
      },
    })
    return ret
  }

}

