/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataSourceManager } from '@midwayjs/core'
import type {
  Attributes,
  Span,
  TraceContext,
  TraceService,
} from '@mwcp/otel'
import type { Context } from '@mwcp/share'
import type {
  Kmore,
  QuerySpanInfo,
} from 'kmore'

import type { DbConfig } from './types.js'


export abstract class AbstractDbSourceManager<SourceName extends string = string, D extends object = object, Ctx extends Context = Context>
  extends DataSourceManager<Kmore | undefined> {

  // kmoreQueryId => QuerySpanInfo
  readonly queryUidSpanMap = new Map<symbol, QuerySpanInfo>()
  // kmoreTrxId => QuerySpanInfo
  readonly trxSpanMap = new Map<symbol, QuerySpanInfo>()

  declare dataSource: Map<SourceName, Kmore<D, Ctx>>

  declare getDataSource: <Db extends object = D>(dataSourceName: SourceName)
  => string extends SourceName ? Kmore<Db, Ctx> | undefined : Kmore<Db, Ctx>

  declare createInstance: <Db extends object = D>(
    config: DbConfig<D, Ctx>,
    clientName: SourceName,
    options?: CreateInstanceOptions,
  ) => Promise<Kmore<Db, Ctx> | undefined>


  abstract getDbConfigByDbId(dbId: SourceName): DbConfig | undefined

  abstract getSpanInfoByKmoreQueryId(kmoreQueryId: symbol): QuerySpanInfo | undefined

  abstract getSpanInfoByKmoreTrxId(kmoreTrxId: symbol): QuerySpanInfo | undefined

  abstract createSpan(traceService: TraceService, options?: CreateSpanOptions): CreateSpanRetType

  abstract getTrxSpanInfoByQueryId(sourceName: SourceName, queryId: symbol): QuerySpanInfo | undefined

}

export interface CreateSpanOptions {
  /**
   * @default 'KmoreComponent'
   */
  name?: string
  traceContext?: TraceContext | undefined
  attributes?: Attributes
}
export interface CreateSpanRetType {
  span: Span
  traceContext: TraceContext
}


export interface CreateInstanceOptions {
  cacheInstance?: boolean | undefined
}

