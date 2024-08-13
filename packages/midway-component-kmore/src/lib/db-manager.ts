import assert from 'node:assert'

import { Inject, Singleton } from '@midwayjs/core'
import { SpanKind, Trace } from '@mwcp/otel'
import type { Kmore } from 'kmore'

import { DbSourceManager } from './db-source-manager.js'
import { ConfigKey } from './types.js'


@Singleton()
export class DbManager<SourceName extends string = string, D extends object = object> {

  @Inject() protected readonly dbSourceManager: DbSourceManager<SourceName>

  getName(): string { return 'dbManager' }

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
    const db = this.dbSourceManager.getDataSource(dataSourceName)
    assert(db, `[${ConfigKey.componentName}] getDataSource() db source empty: "${dataSourceName}"`)
    return db as Kmore<Db>
  }

}

