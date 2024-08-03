/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import {
  type AsyncContextManager,
  App,
  ApplicationContext,
  ASYNC_CONTEXT_KEY,
  ASYNC_CONTEXT_MANAGER_KEY,
  IMidwayContainer,
  Init,
  Inject,
  Logger as _Logger,
  Singleton,
} from '@midwayjs/core'
import { ILogger } from '@midwayjs/logger'
import {
  Attributes,
  setSpan,
  Span,
  SpanKind,
  TraceContext,
  TraceInit,
  TraceService,
} from '@mwcp/otel'
import { Application, Context, MConfig } from '@mwcp/share'
import { genError } from '@waiting/shared-core'
import {
  type BuilderProcessorOptions,
  type ResponseProcessorOptions,
  type ExceptionHandlerOptions,
  type KmoreFactoryOpts,
  type QuerySpanInfo,
  type EventCallbacks,
  type KmoreEvent,
  type Kmore,
  type TransactionProcessorOptions,
  KmoreFactory,
  getCurrentTime,
} from 'kmore'

import { AbstractDbSourceManager } from './db-source-manager-base.js'
import { genCallerKey } from './propagation/trx-status.helper.js'
import {
  traceStartEvent,
  TraceQueryEvent,
  TraceQueryRespEvent,
  TraceQueryExceptionEvent,
  TraceStartEventOptions,
  TraceEventOptions,
} from './tracer-helper.js'
import { TrxStatusService } from './trx-status.service.js'
import { ConfigKey, KmoreSourceConfig, DbConfig } from './types.js'


@Singleton()
export class DbSourceManager<SourceName extends string = string, D extends object = object>
  extends AbstractDbSourceManager<SourceName, D> {

  @MConfig(ConfigKey.config) private readonly sourceConfig: KmoreSourceConfig<SourceName>

  @App() readonly app: Application
  @ApplicationContext() readonly applicationContext: IMidwayContainer

  @_Logger() private readonly logger: ILogger

  @Inject() baseDir: string

  @Inject() readonly trxStatusSvc: TrxStatusService
  @Inject() readonly traceService: TraceService

  @TraceInit(`INIT ${ConfigKey.namespace}.DbSourceManager.init()`)
  @Init()
  async init(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (! this?.sourceConfig?.dataSource) {
      this.logger.info('dataSourceConfig is not defined')
      return
    }
    // 需要注意的是，这里第二个参数需要传入一个实体类扫描地址
    await this.initDataSource(this.sourceConfig, this.baseDir)
  }

  getDbConfigByDbId(dbId: SourceName): DbConfig | undefined {
    assert(dbId)
    const dbConfig = this.sourceConfig.dataSource[dbId]
    return dbConfig
  }

  getWebContext(): Context | undefined {
    try {
      const contextManager: AsyncContextManager = this.applicationContext.get(
        ASYNC_CONTEXT_MANAGER_KEY,
      )
      const ctx = contextManager.active().getValue(ASYNC_CONTEXT_KEY) as Context | undefined
      return ctx
    }
    catch (ex) {
      void ex
      // console.warn(new Error('getWebContext() failed', { cause: ex }))
      return void 0
    }
  }

  getWebContextThenApp(): Context | Application {
    try {
      const webContext = this.getWebContext()
      assert(webContext, 'getActiveContext() webContext should not be null, maybe this calling is not in a request context')
      return webContext
    }
    catch (ex) {
      console.warn('getWebContextThenApp() failed', ex)
      return this.app
    }
  }

  /**
   * 创建单个实例
   */
  protected async createDataSource<Db extends object>(
    config: DbConfig<Db>,
    dataSourceName: SourceName,
    cacheDataSource = true,
  ): Promise<Kmore<Db> | undefined> {

    const cacheInst = cacheDataSource ? this.getDataSource<Db>(dataSourceName) : null
    if (cacheDataSource && cacheInst) {
      return cacheInst
    }
    const inst = await this._createDataSource(config, dataSourceName, cacheDataSource)
    assert(inst, `createDataSource() failed: ${dataSourceName}`)
    this.createProxy(inst)
    return inst
  }

  /**
   * 创建单个实例
   */
  @TraceInit<DbSourceManager['_createDataSource']>({
    spanName: ([, dataSourceName]) => `INIT ${ConfigKey.namespace}.DbSourceManager._createDataSource():${dataSourceName}`,
    before: (args) => {
      if (! args[0].traceInitConnection) { return }

      const config: DbConfig = { ...args[0] }
      delete config.dict
      delete config.eventCallbacks

      const events: Attributes = {
        event: 'createDataSource.before',
        config: JSON.stringify(config),
        cacheDataSource: args[2],
        dataSourceName: args[1],
      }
      return { events }
    },
  })
  protected async _createDataSource(
    config: DbConfig,
    dataSourceName: SourceName,
    cacheDataSource = true,
  ): Promise<Kmore | undefined> {

    const globalEventCbs: EventCallbacks = {
      start: (event: KmoreEvent, ctx?: Kmore) => { this.cbOnStart(config, event, ctx) },
      query: (event: KmoreEvent, ctx?: Kmore) => { this.cbOnQuery(config, event, ctx) },
      queryResponse: (event: KmoreEvent, ctx?: Kmore) => { this.cbOnResp(config, event, ctx) },
      queryError: (event: KmoreEvent, ctx?: Kmore) => this.cbOnError(config, event, ctx),
    }
    const opts: KmoreFactoryOpts<unknown> = {
      dbId: dataSourceName,
      ...config,
      eventCallbacks: globalEventCbs,
    }

    const inst = KmoreFactory(opts)
    if (cacheDataSource) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (! this.sourceConfig.dataSource[dataSourceName]) {
        this.sourceConfig.dataSource[dataSourceName] = config
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
      this.logger.error('[KmoreDbSourceManager]: checkConnected(). error ignored', ex)
    }
    return false
  }

  override async destroyDataSource(dataSource: Kmore): Promise<void> {
    if (await this.checkConnected(dataSource)) {
      try {
        await dataSource.destroy()
        // @ts-expect-error
        this.dataSource.delete(dataSource.dbId)
        this.trxStatusSvc.unregisterDbInstance(dataSource.dbId)
      }
      catch (ex: unknown) {
        this.logger.error(`Destroy knex connection failed with identifier: "${dataSource.instanceId.toString()}" :
          \n${(ex as Error).message}`)
      }
    }
  }

  // #region event callbacks

  protected cbOnStart(dbConfig: DbConfig, event: KmoreEvent, ctx?: Kmore): void {
    assert(dbConfig)
    assert(event.type === 'start', event.type)
    assert(event.queryBuilder)

    this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.start
    return cb?.(event, ctx)
  }

  protected cbOnQuery(dbConfig: DbConfig, event: KmoreEvent, ctx?: Kmore): void {
    assert(dbConfig)
    assert(event.type === 'query', event.type)
    assert(event.data)

    this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.query
    return cb?.(event, ctx)
  }

  protected cbOnResp(dbConfig: DbConfig, event: KmoreEvent, ctx?: Kmore): void {
    assert(dbConfig)
    assert(event.type === 'queryResponse', event.type)
    assert(event.respRaw)

    this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.queryResponse
    return cb?.(event, ctx)
  }

  protected async cbOnError(dbConfig: DbConfig, event: KmoreEvent, ctx?: Kmore): Promise<void> {
    assert(dbConfig)
    assert(event.type === 'queryError', event.type)

    this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.queryError
    return cb?.(event, ctx)
  }

  // #region tracer

  protected tracer(dbConfig: DbConfig, event: KmoreEvent, ctx?: unknown): void {
    if (! ctx) { return }
    if (! dbConfig.enableTrace) { return }

    if (typeof dbConfig.sampleThrottleMs === 'undefined') {
      dbConfig.sampleThrottleMs = 3000
    }
    const traceSvc = this.traceService

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
    const kmore = this.getDataSource(sourceName)
    assert(kmore, `getTrxSpanInfoByQueryId() dataSource not found: ${sourceName}`)

    const trx = kmore.getTrxByQueryId(queryId)
    if (! trx) { return }
    const querySpanInfo = this.trxSpanMap.get(trx.kmoreTrxId)
    return querySpanInfo
  }

  // #region proxy

  protected createProxy(db: Kmore): void {
    // dbId is dbSourceName
    this.trxStatusSvc.registerDbInstance(db.dbId, db)

    db.builderPreProcessors.unshift(this.builderPreProcessor.bind(this))
    db.builderPostProcessors.unshift(this.builderPostProcessor.bind(this))

    db.responsePreProcessors.unshift(this.builderResultPreProcessor.bind(this))
    db.exceptionProcessors.unshift(this.exceptionProcessor.bind(this))

    db.transactionPostProcessors.unshift(this.transactionPostProcessors.bind(this))
  }

  // #region builder processor

  builderPreProcessor(options: BuilderProcessorOptions): BuilderProcessorOptions {
    const ret = this.builderPrePropagating(options)
    return ret
  }

  builderPostProcessor(options: BuilderProcessorOptions): Promise<BuilderProcessorOptions > {
    const ret = this.builderPostPropagating(options)
    return ret
  }

  protected builderPrePropagating(options: BuilderProcessorOptions): BuilderProcessorOptions {
    const { kmore, builder } = options

    if (builder.trxPropagated) {
      return options
    }

    const scope = this.getWebContextThenApp()
    /* Call stack in bindBuilderPropagationData():
      1 - TrxStatusService.bindBuilderPropagationData(trx - status.service.ts: 389)
      2 - DbSourceManager.builderPrePropagating(db - source - manager.ts: 377)
      3 - DbSourceManager.builderPreProcessor(db - source - manager.ts: 378)
      4 - <anonymous>(builder.index.js: 67)
      5 - extRefTableFnProperty(builder.index.js: 64)
      6 - tb_user(builder.index.js: 28)
      7 - UserRepo6.getUsers(70c.cache.repo.ts: 78) <-- call from here 6+1
      8 - Clz.<computed>(aspectService.js: 92)
    */
    /*
      1 - TrxStatusService.bindBuilderPropagationData (trx-status.service.ts:318)
      2 - DbSourceManager.builderPrePropagating (db-source-manager.ts:404)
      3 - DbSourceManager.builderPreProcessor (db-source-manager.ts:377)
      4 - <anonymous> (builder.index.js:62)
      5 - createQueryBuilder (builder.index.js:59)
      6 - tb_user (builder.index.js:27)
      7 - TrxRepo._update (101/101r.middle-trx-auto-action.repo.ts:46)  <-- call from here 6+1
      8 - TrxRepo.commit (101/101r.middle-trx-auto-action.repo.ts:33)
    */
    this.trxStatusSvc.bindBuilderPropagationData(kmore.dbId, scope, builder, 6)
    return options
  }

  protected async builderPostPropagating(options: BuilderProcessorOptions): Promise<BuilderProcessorOptions> {
    const { builder } = options

    if (builder.trxPropagated) {
      return options
    }

    const scope = this.getWebContextThenApp()
    await this.trxStatusSvc.propagating({
      builder,
      db: options.kmore,
      dbSourceManager: this as unknown as AbstractDbSourceManager,
      scope,
    })

    return options
  }

  async builderResultPreProcessor(options: ResponseProcessorOptions): Promise<ResponseProcessorOptions> {
    if (options.kmoreTrxId && options.trxPropagated && options.trxPropagateOptions) {
      const { builder, rowLockLevel } = options
      if (rowLockLevel) {
        // @FIXME
        // this.trxStatusSvc.updateBuilderSpanRowlockLevelTag(kmoreQueryId, rowLockLevel)
        void builder
      }

      // const { className, funcName } = options.trxPropagateOptions
      // const callerKey = genCallerKey(className, funcName)
      // assert(callerKey, 'callerKey is empty')

      // const tkey = this.trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
    }

    return options
  }

  // #region exception processor

  async exceptionProcessor(options: ExceptionHandlerOptions): Promise<never> {
    if (options.trxPropagated && options.trxPropagateOptions) {
      const { kmore, builder, rowLockLevel } = options
      if (rowLockLevel) {
        // @FIXME
        // this.trxStatusSvc.updateBuilderSpanRowlockLevelTag(kmoreQueryId, rowLockLevel)
        void builder
      }

      const { className, funcName } = options.trxPropagateOptions
      const callerKey = genCallerKey(className, funcName)
      assert(callerKey, 'callerKey is empty')
      // const tkey = this.trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
      // if (tkey !== callerKey) {
      const scope = this.getWebContextThenApp()
      await this.trxStatusSvc.trxRollbackEntry(kmore.dbId, scope, callerKey)
      // }
    }

    const err = genError({ error: options.exception, altMessage: '[kmore-component] DbManager#exceptionHandler' })
    throw err
  }

  // #region transaction processor

  async transactionPostProcessors(options: TransactionProcessorOptions): Promise<TransactionProcessorOptions> {
    const ret = this.transactionPostProcessor(options)
    return ret
  }

  protected async transactionPostProcessor(options: TransactionProcessorOptions): Promise<TransactionProcessorOptions> {
    const { trx } = options
    if (! trx.scope) {
      const ctx = this.getWebContext()
      assert(ctx, 'transactionPostProcessor() ctx is empty, maybe not in a request context, must define trx.scope')
      trx.scope = ctx
    }
    return options
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

