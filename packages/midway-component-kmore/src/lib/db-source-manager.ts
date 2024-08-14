/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Attributes, TraceInit } from '@mwcp/otel'
import { Application, Context, MConfig, getWebContext } from '@mwcp/share'
import {
  type KmoreFactoryOpts,
  type EventCallbacks,
  type KmoreEvent,
  type Kmore,
  KmoreFactory,
  getCurrentTime,
} from 'kmore'

import { DbEvent } from './db-event.js'
import { DbHook } from './db-hook/index.db-hook.js'
import { TrxStatusService } from './trx-status.service.js'
import { ConfigKey, KmoreSourceConfig, DbConfig } from './types.js'


@Singleton()
export class DbSourceManager<SourceName extends string = string> extends DataSourceManager<Kmore> {

  @MConfig(ConfigKey.config) private readonly sourceConfig: KmoreSourceConfig<SourceName>

  @App() readonly app: Application
  @ApplicationContext() readonly applicationContext: IMidwayContainer

  @_Logger() private readonly logger: ILogger

  @Inject() baseDir: string

  @Inject() readonly dbEvent: DbEvent
  @Inject() readonly dbHook: DbHook
  @Inject() readonly trxStatusSvc: TrxStatusService

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

  protected getDbConfigByDbId(dbId: SourceName): DbConfig | undefined {
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

  /**
   * 创建单个实例
   */
  protected async createDataSource<Db extends object>(
    config: DbConfig<Db>,
    dataSourceName: SourceName,
    useCachedDataSource = true,
  ): Promise<Kmore<Db> | undefined> {

    const cacheInst = useCachedDataSource ? this.getDataSource(dataSourceName) : null
    if (useCachedDataSource && cacheInst) {
      return cacheInst
    }
    const inst = await this._createDataSource(config, dataSourceName, useCachedDataSource)
    assert(inst, `createDataSource() failed: ${dataSourceName}`)
    this.dbHook.createProxy(inst)
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
      start: (event: KmoreEvent, kmore: Kmore) => {
        this.dbEvent.onStart({ dataSourceName, dbConfig: config, event, kmore })
      },
      query: (event: KmoreEvent, kmore: Kmore) => {
        this.dbEvent.onQuery({ dataSourceName, dbConfig: config, event, kmore })
      },
      queryResponse: (event: KmoreEvent, kmore: Kmore) => {
        this.dbEvent.onResp({ dataSourceName, dbConfig: config, event, kmore })
      },
      queryError: (event: KmoreEvent, kmore: Kmore) => {
        return this.dbEvent.onError({ dataSourceName, dbConfig: config, event, kmore })
      },
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

  // #region trxSpanMap

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
        this.dataSource.delete(dataSource.dbId)
        this.trxStatusSvc.unregisterDbInstance(dataSource.dbId)
      }
      catch (ex: unknown) {
        this.logger.error(`Destroy knex connection failed with identifier: "${dataSource.instanceId.toString()}" :
          \n${(ex as Error).message}`)
      }
    }
  }

}

