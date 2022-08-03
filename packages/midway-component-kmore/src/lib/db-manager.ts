/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import assert from 'node:assert'

import {
  Inject,
  Provide,
} from '@midwayjs/decorator'
import { Kmore } from 'kmore'

import { Context } from '../interface'

import { DbSourceManager } from './db-source-manager'


@Provide()
export class DbManager<SourceName extends string = string, D = unknown, Ctx = Context> {

  @Inject() readonly ctx: Ctx

  @Inject() dbSourceManager: DbSourceManager<SourceName, D, Ctx>

  getName(): string { return 'dbManager' }

  getDataSource<Db = D>(dataSourceName: SourceName): Kmore<Db, Ctx> {
    const db = this.dbSourceManager.getDataSource<Db>(dataSourceName)
    assert(db)

    const reqCtx = this.ctx;

    ['camelTables', 'refTables', 'snakeTables', 'pascalTables'].forEach((prop) => {
      const key = prop as unknown as (keyof Kmore<Db, Ctx> & string)
      if (! Object.hasOwn(db, key)) { return }

      const refObj = db[key]
      if (! refObj || ! Object.keys(refObj).length) { return }

      Object.entries(refObj).forEach(([refTableName, fn]) => {
        if (typeof fn !== 'function') { return }

        const value = new Proxy(fn, {
          apply: (target: any, ctx: unknown, args: unknown[]) => Reflect.apply(
            target,
            ctx,
            args && args.length ? args : [reqCtx],
          ),
        })

        Object.defineProperty(refObj, refTableName, {
          enumerable: true,
          writable: true,
          configurable: false,
          value,
        })
      })

    })

    return db
  }

}

