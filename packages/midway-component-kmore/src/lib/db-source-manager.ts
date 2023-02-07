/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import {
  Config as _Config,
  Init,
  Inject,
  Logger as _Logger,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/core'
import { ILogger } from '@midwayjs/logger'
import {
  Attributes,
  OtelConfigKey,
  setSpan,
  Span,
  SpanKind,
  TraceContext,
  TraceService,
} from '@mwcp/otel'
import type { Context } from '@mwcp/share'
import {
  EventCallbacks,
  Kmore,
  KmoreEvent,
  KmoreFactory,
  KmoreFactoryOpts,
  QuerySpanInfo,
  getCurrentTime,
} from 'kmore'

import { AbstractDbSourceManager } from './db-source-manager-base'
import {
  traceStartEvent,
  TraceQueryEvent,
  TraceQueryRespEvent,
  TraceQueryExceptionEvent,
  TraceStartEventOptions,
  TraceEventOptions,
} from './tracer-helper'
import { ConfigKey, KmoreSourceConfig, DbConfig } from './types'


@Provide()
@Scope(ScopeEnum.Singleton)
export class DbSourceManager<SourceName extends string = string, D = unknown, Ctx extends Context = Context>
  extends AbstractDbSourceManager<SourceName, D, Ctx> {

  @_Config(ConfigKey.config) private readonly sourceconfig: KmoreSourceConfig<SourceName>

  @_Logger() private readonly logger: ILogger

  @Inject() baseDir: string

  // // kmoreQueryId => QuerySpanInfo
  // readonly queryUidSpanMap = new Map<symbol, QuerySpanInfo>()
  // // kmoreTrxId => QuerySpanInfo
  // readonly trxSpanMap = new Map<symbol, QuerySpanInfo>()
  // declare dataSource: Map<SourceName, Kmore<D, Ctx>>
  // declare getDataSource: <Db = D>(dataSourceName: SourceName)
  // => string extends SourceName ? Kmore<Db, Ctx> | undefined : Kmore<Db, Ctx>
  // declare createInstance: <Db = D>(
  //   config: DbConfig<D, Ctx>,
  //   clientName: SourceName,
  //   options?: CreateInstanceOptions,
  // ) => Promise<Kmore<Db, Ctx> | void>

  @Init()
  async init(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (! this?.sourceconfig?.dataSource) {
      this.logger.info('dataSourceConfig is not defined')
      return
    }
    // 需要注意的是，这里第二个参数需要传入一个实体类扫描地址
    await this.initDataSource(this.sourceconfig, this.baseDir)
  }

  getDbConfigByDbId(dbId: SourceName): DbConfig | undefined {
    assert(dbId)
    const dbConfig = this.sourceconfig.dataSource[dbId]
    return dbConfig
  }


  /**
   * 创建单个实例
   */
  protected async createDataSource<Db>(
    config: DbConfig<Db, Ctx>,
    dataSourceName: SourceName,
    cacheDataSource = true,
  ): Promise<Kmore<Db, Ctx> | undefined> {

    const cacheInst = cacheDataSource ? this.getDataSource<Db>(dataSourceName) : null
    if (cacheDataSource && cacheInst) {
      return cacheInst
    }

    const globalEventCbs: EventCallbacks = {
      start: (event: KmoreEvent, ctx?: Ctx) => this.cbOnStart(config, event, ctx),
      query: (event: KmoreEvent, ctx?: Ctx) => this.cbOnQuery(config, event, ctx),
      queryResponse: (event: KmoreEvent, ctx?: Ctx) => this.cbOnResp(config, event, ctx),
      queryError: (event: KmoreEvent, ctx?: Ctx) => this.cbOnError(config, event, ctx),
    }
    const opts: KmoreFactoryOpts<Db, Ctx> = {
      dbId: dataSourceName,
      ...config,
      eventCallbacks: globalEventCbs,
    }

    const inst = KmoreFactory<Db, Ctx>(opts)
    if (cacheDataSource) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (! this.sourceconfig.dataSource[dataSourceName]) {
        this.sourceconfig.dataSource[dataSourceName] = config
      }
    }

    if (! cacheDataSource) {
      // saved in initDataSource
      this.dataSource.delete(dataSourceName)
    }
    return inst
  }

  getSpanInfoByKmoreQueryId(kmoreQueryId: symbol): QuerySpanInfo | undefined {
    return this.queryUidSpanMap.get(kmoreQueryId)
  }

  getSpanInfoByKmoreTrxId(kmoreTrxId: symbol): QuerySpanInfo | undefined {
    return this.trxSpanMap.get(kmoreTrxId)
  }

  getName(): string {
    return 'dbSourceManager'
  }

  protected async checkConnected(dataSource: Kmore): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (! dataSource) {
      return false
    }
    const { dbh, config } = dataSource

    try {
      const time = await getCurrentTime(dbh, config.client)
      return !! time
    }
    catch (ex) {
      this.logger.error('[KmoreDbSourceManager]: checkConnected()', ex)
    }
    return false
  }

  override async destroyDataSource(dataSource: Kmore): Promise<void> {
    if (await this.checkConnected(dataSource)) {
      try {
        await dataSource.destroy()
        // @ts-expect-error
        this.dataSource.delete(dataSource.dbId)
      }
      catch (ex: unknown) {
        this.logger.error(
          `Destroy knex connection failed with identifier: "${dataSource.instanceId.toString()}" :
          \n${(ex as Error).message}`,
        )
      }
    }
  }


  protected cbOnStart(dbConfig: DbConfig, event: KmoreEvent, ctx?: Ctx): void {
    assert(dbConfig)
    assert(event.type === 'start', event.type)
    assert(event.queryBuilder)

    this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.start
    return cb?.(event, ctx)
  }

  protected cbOnQuery(dbConfig: DbConfig, event: KmoreEvent, ctx?: Ctx): void {
    assert(dbConfig)
    assert(event.type === 'query', event.type)
    assert(event.data)

    this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.query
    return cb?.(event, ctx)
  }

  protected cbOnResp(dbConfig: DbConfig, event: KmoreEvent, ctx?: Ctx): void {
    assert(dbConfig)
    assert(event.type === 'queryResponse', event.type)
    assert(event.respRaw)

    this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.queryResponse
    return cb?.(event, ctx)
  }

  protected async cbOnError(dbConfig: DbConfig, event: KmoreEvent, ctx?: Ctx): Promise<void> {
    assert(dbConfig)
    assert(event.type === 'queryError', event.type)

    this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.queryError
    return cb?.(event, ctx)
  }


  protected tracer(dbConfig: DbConfig, event: KmoreEvent, ctx?: Ctx): void {
    if (! ctx) { return }
    if (! dbConfig.enableTrace) { return }

    if (typeof dbConfig.sampleThrottleMs === 'undefined') {
      dbConfig.sampleThrottleMs = 3000
    }
    const traceSvc = ctx[`_${OtelConfigKey.serviceName}`] as TraceService | undefined
    if (! traceSvc) { return }

    const { queryUidSpanMap } = this
    const opts: TraceEventOptions = {
      dbConfig,
      ev: event,
      queryUidSpanMap,
      traceSvc,
    }

    if (event.queryBuilder) {
      void Object.defineProperty(event.queryBuilder, 'eventProcessed', {
        value: true,
      })
    }

    switch (event.type) {
      case 'start': {
        const { kmoreQueryId } = event
        const trxQuerySpanInfo = this.getTrxSpanInfoByQueryId(event.dbId as SourceName, event.kmoreQueryId)
        const { span } = this.createSpan(traceSvc, {
          traceContext: trxQuerySpanInfo?.traceContext,
          attributes: { kmoreQueryId: kmoreQueryId.toString() },
        })
        const opts2: TraceStartEventOptions = {
          ...opts,
          span,
        }
        traceStartEvent(opts2)
        break
      }

      case 'query':
        TraceQueryEvent(opts)
        break

      case 'queryResponse':
        TraceQueryRespEvent(opts)
        break

      case 'queryError':
        TraceQueryExceptionEvent(opts)
        break

      default:
        break
    }
  }

  createSpan(traceService: TraceService, options?: CreateSpanOptions): CreateSpanRetType {
    const tmpCtx = options?.traceContext ?? traceService.getActiveContext()
    const name = options?.name ?? 'KmoreComponent'
    const opts = {
      kind: SpanKind.INTERNAL,
      attributes: options?.attributes ?? {},
    }
    const span = traceService.startSpan(
      name,
      opts,
      tmpCtx,
    )
    const ret = {
      span,
      traceContext: setSpan(tmpCtx, span),
    }
    return ret
  }

  getTrxSpanInfoByQueryId(sourceName: SourceName, queryId: symbol): QuerySpanInfo | undefined {
    if (! this.trxSpanMap.size) { return }
    const dataSource = this.getDataSource(sourceName)
    assert(dataSource, `getTrxSpanInfoByQueryId() dataSource not found: ${sourceName}`)

    const trx = dataSource.getTrxByKmoreQueryId(queryId)
    if (! trx) { return }
    const querySpanInfo = this.trxSpanMap.get(trx.kmoreTrxId)
    return querySpanInfo
  }

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

