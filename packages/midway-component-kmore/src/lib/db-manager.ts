/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import assert from 'node:assert'

import { Inject, Singleton } from '@midwayjs/core'
import { Attributes, SpanKind, Trace } from '@mwcp/otel'
import { MConfig } from '@mwcp/share'
import type { Kmore } from 'kmore'

import { DbSourceManager } from './db-source-manager.js'
import { eventNeedTrace, genCommonAttr } from './trace.helper.js'
import { type KmoreSourceConfig, ConfigKey, DbConfig, KmoreAttrNames } from './types.js'


@Singleton()
export class DbManager<SourceName extends string = string, D extends object = object> {

  @MConfig(ConfigKey.config) private readonly sourceConfig: KmoreSourceConfig<SourceName>
  @Inject() protected readonly dbSourceManager: DbSourceManager<SourceName>

  getName(): string { return 'dbManager' }

  /**
   * Check the data source is connected
   */
  async isConnected(dataSourceName: SourceName): Promise<boolean> {
    return this.dbSourceManager.isConnected(dataSourceName)
  }

  getDbConfigByDbId(dbId: SourceName): DbConfig | undefined {
    assert(dbId)
    const dbConfig = this.sourceConfig.dataSource[dbId]
    return dbConfig
  }

  @Trace<DbManager['getDataSource']>({
    spanName: () => 'DbManager getDataSource',
    startActiveSpan: false,
    kind: SpanKind.INTERNAL,
    before([dataSourceName]) {
      const dbConfig = this.getDbConfigByDbId(dataSourceName)
      if (dbConfig && ! eventNeedTrace(KmoreAttrNames.getDataSourceStart, dbConfig)) { return }

      const attrs: Attributes = {
        dbId: dataSourceName,
      }
      const events = genCommonAttr(KmoreAttrNames.getDataSourceStart)
      return { attrs, events }
    },
    after([dataSourceName]) {
      const dbConfig = this.getDbConfigByDbId(dataSourceName)
      if (dbConfig && ! eventNeedTrace(KmoreAttrNames.getDataSourceStart, dbConfig)) { return }

      const events = genCommonAttr(KmoreAttrNames.getDataSourceEnd)
      return { events }
    },
  })
  getDataSource<Db extends object = D>(this: DbManager<SourceName, Db>, dataSourceName: SourceName): Kmore<Db> {
    const db = this.dbSourceManager.getDataSource(dataSourceName)
    assert(db, `[${ConfigKey.componentName}] getDataSource() db source empty: "${dataSourceName}"`)
    assert(db.dbId === dataSourceName, `[${ConfigKey.componentName}] getDataSource() db source id not match: "${dataSourceName}"`)
    return db as Kmore<Db>
  }

}

