/* eslint-disable max-lines-per-function */
import assert from 'node:assert'

import {
  App,
  ApplicationContext,
  DataSourceManager,
  IMidwayContainer,
  Init,
  Inject,
  Logger as _Logger,
  Singleton,
} from '@midwayjs/core'
import { ILogger } from '@midwayjs/logger'
import { type TraceContext, Attributes, SpanKind, Trace, TraceInit } from '@mwcp/otel'
import { Application, Context, MConfig, getWebContext } from '@mwcp/share'
import { context } from '@opentelemetry/api'
import {
  type EventCallbacks,
  type Kmore,
  type KmoreEvent,
  type KmoreFactoryOpts,
  KmoreFactory,
  getCurrentTime,
} from 'kmore'

import { DbEvent } from './db-event.js'
import { DbHook } from './db-hook/index.db-hook.js'
import { eventNeedTrace, genCommonAttr } from './trace.helper.js'
import { TrxStatusService } from './trx-status.service.js'
import { type KmoreSourceConfig, ConfigKey, DbConfig, KmoreAttrNames } from './types.js'


@Singleton()
export class DbManager<SourceName extends string = string, D extends object = object> extends DataSourceManager<Kmore> {

  @MConfig(ConfigKey.config) private readonly sourceConfig: KmoreSourceConfig<SourceName>

  @App() readonly app: Application
  @ApplicationContext() readonly applicationContext: IMidwayContainer

  @_Logger() private readonly logger: ILogger

  @Inject() readonly baseDir: string

  @Inject() private readonly dbEvent: DbEvent
  @Inject() private readonly dbHook: DbHook
  @Inject() private readonly trxStatusSvc: TrxStatusService

  @TraceInit(`INIT ${ConfigKey.namespace}.DbSourceManager.init()`)
  @Init()
  async init(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (! this?.sourceConfig?.dataSource) {
      this.logger.info('dataSourceConfig is not defined')
      return
    }
    await this.initDataSource(this.sourceConfig, '')
  }

  getDbConfigByDbId(dbId: SourceName): DbConfig | undefined {
    assert(dbId)
    const dbConfig = this.sourceConfig.dataSource[dbId]
    return dbConfig
  }

  protected getWebContext(): Context | undefined {
    return getWebContext(this.applicationContext)
  }

  protected getWebContextThenApp(): Context | Application {
    try {
      const webContext = getWebContext(this.applicationContext)
      assert(webContext, 'getActiveContext() webContext should not be null, maybe this calling is not in a request context')
      return webContext
    }
    catch (ex) {
      console.warn('getWebContextThenApp() failed', ex)
      return this.app
    }
  }


  getName(): string {
    return 'dbManager'
  }

  // #region checkConnected

  async checkConnected(dataSource: Kmore): Promise<boolean> {
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

  // #region createDataSource

  /**
   * 创建单个实例
   */
  protected async createDataSource<Db extends object>(
    config: DbConfig<Db>,
    dataSourceName: SourceName,
  ): Promise<Kmore<Db> | undefined> {

    const inst = await this._createDataSource(config, dataSourceName)
    assert(inst, `createDataSource() failed: ${dataSourceName}`)
    this.dbHook.createProxy(inst)
    return inst
  }

  // #region getDataSource

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
  override getDataSource<Db extends object = D>(this: DbManager<SourceName, D>, dataSourceName: SourceName): Kmore<Db> {
    const db = super.getDataSource(dataSourceName)
    assert(db, `[${ConfigKey.componentName}] getDataSource() db source empty: "${dataSourceName}"`)
    assert(db.dbId === dataSourceName, `[${ConfigKey.componentName}] getDataSource() db source id not match: "${dataSourceName}"`)
    return db as Kmore<Db>
  }

  // #region destroyDataSource

  override async destroyDataSource(dataSource: Kmore): Promise<void> {
    if (await this.checkConnected(dataSource)) {
      try {
        await dataSource.destroy()
        this.dataSource.delete(dataSource.dbId)
        this.trxStatusSvc.unregisterDbInstance(dataSource.dbId)
      }
      catch (ex: unknown) {
        this.logger.error(`Destroy knex connection failed with identifier: "${dataSource.instanceId.toString()}" :
          \n${(ex as Error).message}`)
      }
    }
  }



  /**
   * 创建单个实例
   */
  @TraceInit<DbManager['_createDataSource']>({
    spanName: ([, dataSourceName]) => `INIT ${ConfigKey.namespace}.DbSourceManager._createDataSource():${dataSourceName}`,
    before: (args) => {
      if (! args[0].traceInitConnection) { return }

      const config: DbConfig = { ...args[0] }
      delete config.dict
      delete config.eventCallbacks

      const events: Attributes = {
        event: 'createDataSource.before',
        config: JSON.stringify(config),
        dataSourceName: args[1],
      }
      return { events }
    },
  })
  private async _createDataSource(
    config: DbConfig,
    dataSourceName: SourceName,
  ): Promise<Kmore | undefined> {

    const globalEventCbs: EventCallbacks = {
      start: (event: KmoreEvent, kmore: Kmore) => {
        if (kmore.enableTrace) {
          let activeTraceCtx: TraceContext | undefined

          const traceScope = this.dbEvent.retrieveTraceScope(kmore, event.kmoreQueryId, event.queryBuilder)
          const [activeRoot] = this.trxStatusSvc.getTraceContextArrayByScope(traceScope)
          if (activeRoot) {
            activeTraceCtx = activeRoot
          }
          else {
            const trx = kmore.getTrxByQueryId(event.kmoreQueryId)
            activeTraceCtx = trx ? kmore.trx2TraceContextMap.get(trx) : void 0
          }

          context.with(activeTraceCtx ?? context.active(), () => {
            this.dbEvent.onStart({ dataSourceName, dbConfig: config, event, kmore })
          })
          return
        }
        this.dbEvent.onStart({ dataSourceName, dbConfig: config, event, kmore })
      },
      query: (event: KmoreEvent, kmore: Kmore) => {
        if (kmore.enableTrace) {
          let activeTraceCtx = this.trxStatusSvc.getActiveTraceContextByScope(event.kmoreQueryId)
          if (! activeTraceCtx) {
            const traceScope = this.dbEvent.retrieveTraceScope(kmore, event.kmoreQueryId, event.queryBuilder)
            const active = this.trxStatusSvc.getTraceContextArrayByScope(traceScope).at(-1)
            if (active) {
              activeTraceCtx = active
            }
            else {
              const trx = kmore.getTrxByQueryId(event.kmoreQueryId)
              activeTraceCtx = trx ? kmore.trx2TraceContextMap.get(trx) : void 0
            }
          }
          context.with(activeTraceCtx ?? context.active(), () => {
            this.dbEvent.onQuery({ dataSourceName, dbConfig: config, event, kmore })
          })
          return
        }
        this.dbEvent.onQuery({ dataSourceName, dbConfig: config, event, kmore })
      },
      queryResponse: (event: KmoreEvent, kmore: Kmore) => {
        if (kmore.enableTrace) {
          let activeTraceCtx = this.trxStatusSvc.getActiveTraceContextByScope(event.kmoreQueryId)
          if (! activeTraceCtx) {
            const traceScope = this.dbEvent.retrieveTraceScope(kmore, event.kmoreQueryId, event.queryBuilder)
            const active = this.trxStatusSvc.getTraceContextArrayByScope(traceScope).at(-1)
            if (active) {
              activeTraceCtx = active
            }
            else {
              const trx = kmore.getTrxByQueryId(event.kmoreQueryId)
              activeTraceCtx = trx ? kmore.trx2TraceContextMap.get(trx) : void 0
            }
          }
          context.with(activeTraceCtx ?? context.active(), () => {
            this.dbEvent.onResp({ dataSourceName, dbConfig: config, event, kmore })
          })
          return
        }
        this.dbEvent.onResp({ dataSourceName, dbConfig: config, event, kmore })
      },
      queryError: (event: KmoreEvent, kmore: Kmore) => {
        if (kmore.enableTrace) {
          let activeTraceCtx = this.trxStatusSvc.getActiveTraceContextByScope(event.kmoreQueryId)
          if (! activeTraceCtx) {
            const traceScope = this.dbEvent.retrieveTraceScope(kmore, event.kmoreQueryId, event.queryBuilder)
            const active = this.trxStatusSvc.getTraceContextArrayByScope(traceScope).at(-1)
            if (active) {
              activeTraceCtx = active
            }
            else {
              const trx = kmore.getTrxByQueryId(event.kmoreQueryId)
              activeTraceCtx = trx ? kmore.trx2TraceContextMap.get(trx) : void 0
            }
          }
          return context.with(activeTraceCtx ?? context.active(), () => {
            return this.dbEvent.onError({ dataSourceName, dbConfig: config, event, kmore })
          })
        }
        return this.dbEvent.onError({ dataSourceName, dbConfig: config, event, kmore })
      },
    }
    const opts: KmoreFactoryOpts<unknown> = {
      dbId: dataSourceName,
      ...config,
      eventCallbacks: globalEventCbs,
    }

    const inst = KmoreFactory(opts)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (! this.sourceConfig.dataSource[dataSourceName]) {
      this.sourceConfig.dataSource[dataSourceName] = config
    }

    return inst
  }

}

