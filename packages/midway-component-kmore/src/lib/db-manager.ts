/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'node:assert'
import { isProxy } from 'node:util/types'

import {
  Inject,
  Provide,
} from '@midwayjs/decorator'
import { Kmore } from 'kmore'

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
      get: (target: Kmore, propKey: keyof Kmore) => {
        if (! keys.has(propKey)) {
          return target[propKey]
        }

        const refObj = target[propKey] as object
        const refObj2 = createRefProxy(refObj, propKey, reqCtx)
        return refObj2
      },
    })

    return ret
  }

}


function createRefProxy(refObj: object, key: string, reqCtx: unknown): object {
  const ret = {}
  Object.entries(refObj).forEach(([refTableName, fn]) => {
    if (typeof fn !== 'function') { return }
    if (isProxy(fn)) {
      throw new TypeError(`${key}:${refTableName} is already a proxy`)
    }

    const value = new Proxy(fn, {
      apply: (target2: () => unknown, ctx: unknown, args: unknown[]) => Reflect.apply(
        target2,
        ctx,
        args && args.length ? args : [reqCtx],
      ),
    })

    Object.defineProperty(ret, refTableName, {
      enumerable: true,
      writable: true,
      configurable: false,
      value,
    })
  })

  return ret
}
