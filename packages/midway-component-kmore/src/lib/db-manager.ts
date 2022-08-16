/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'node:assert'
// import { isProxy } from 'node:util/types'

import {
  Inject,
  Provide,
} from '@midwayjs/decorator'
import { CaseType, DbQueryBuilder, Kmore } from 'kmore'

import { Context } from '../interface'

import { DbSourceManager } from './db-source-manager'


const keys = new Set<PropertyKey>(['camelTables', 'refTables', 'snakeTables', 'pascalTables'])

@Provide()
export class DbManager<SourceName extends string = string, D = unknown, Ctx extends object = Context> {

  @Inject() readonly ctx: Ctx

  @Inject() dbSourceManager: DbSourceManager<SourceName, D, Ctx>

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
    assert(db)

    const reqCtx: Ctx | undefined = this.ctx
    if (! reqCtx) {
      return db
    }

    const db2 = this.createRefProxy(db, reqCtx)
    if (db2) {
      this.instCacheMap.set(dataSourceName, db2)
    }
    return db2
  }

  protected createRefProxy(db: Kmore, reqCtx: Ctx): Kmore<any, Ctx> {
    assert(reqCtx)

    if (! db.ctxTrxIdMap.has(reqCtx)) {
      db.ctxTrxIdMap.set(reqCtx, new Set())
    }

    const ret = new Proxy(db, {
      get: (target: Kmore, propKey: keyof Kmore) => keys.has(propKey)
        ? createRefProxy(target[propKey] as Dbb, reqCtx)
        : target[propKey],
    })
    return ret
  }

}

type Dbb = DbQueryBuilder<Context, object, string, CaseType>

function createRefProxy(
  refObj: Dbb,
  reqCtx: unknown,
): Dbb {

  const ret = new Proxy(refObj, {
    get: (target: Dbb, propKey: PropertyKey) => {
      // @ts-ignore
      if (typeof target[propKey] === 'function') {
        // if (isProxy(target[propKey])) {
        //   throw new TypeError(`${key}:${refTableName} is already a proxy`)
        // }
        const fn = (ctx?: unknown) => {
          const args: unknown[] = ctx ? [ctx] : [reqCtx]
          // @ts-ignore
          return target[propKey](...args)
        }
        return fn
      }

      throw new TypeError(`${propKey.toString()} is not a function`)
    },
  })

  return ret
}
