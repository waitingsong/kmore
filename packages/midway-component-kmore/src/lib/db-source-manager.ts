import assert from 'node:assert'

import { DataSourceManager } from '@midwayjs/core'
import {
  Config as _Config,
  Init,
  Inject,
  Logger as _Logger,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/decorator'
import { ILogger } from '@midwayjs/logger'
import { Logger as TLogger, TracerManager } from '@mwcp/jaeger'
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

import {
  processStartEvent,
  processQueryEvent,
  processQueryRespAndExEvent,
  cleanAllQuerySpan,
} from './tracer-helper'
import { ConfigKey, KmoreSourceConfig, DbConfig } from './types'


@Provide()
@Scope(ScopeEnum.Singleton)
export class DbSourceManager<SourceName extends string = string, D = unknown, Ctx extends Context = Context>
  extends DataSourceManager<Kmore | undefined> {

  @_Config(ConfigKey.config) private readonly sourceconfig: KmoreSourceConfig<SourceName>

  @_Logger() private readonly logger: ILogger

  @Inject() baseDir: string

  public queryUidSpanMap = new Map<string, QuerySpanInfo>()

  declare dataSource: Map<SourceName, Kmore<D, Ctx>>

  declare getDataSource: <Db = D>(dataSourceName: SourceName)
  => string extends SourceName ? Kmore<Db, Ctx> | undefined : Kmore<Db, Ctx>

  declare createInstance: <Db = D>(
    config: DbConfig<D, Ctx>,
    clientName: SourceName,
    options?: CreateInstanceOptions,
  ) => Promise<Kmore<Db, Ctx> | void>

  @Init()
  async init(): Promise<void> {
    if (! this.sourceconfig || ! this.sourceconfig.dataSource) {
      this.logger.info('dataSourceConfig is not defined')
      return
    }
    // 需要注意的是，这里第二个参数需要传入一个实体类扫描地址
    await this.initDataSource(this.sourceconfig, this.baseDir)
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
    if (cacheDataSource && inst) {
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


  getName(): string {
    return 'dbSourceManager'
  }

  protected async checkConnected(dataSource: Kmore): Promise<boolean> {
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


  protected async cbOnStart(dbConfig: DbConfig, event: KmoreEvent, ctx?: Ctx): Promise<void> {
    assert(dbConfig)
    assert(event.type === 'start', event.type)
    assert(event.queryBuilder)

    await this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.start
    await (cb && cb(event, ctx))
  }

  protected async cbOnQuery(dbConfig: DbConfig, event: KmoreEvent, ctx?: Ctx): Promise<void> {
    assert(dbConfig)
    assert(event.type === 'query', event.type)
    assert(event.data)

    await this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.query
    await (cb && cb(event, ctx))
  }

  protected async cbOnResp(dbConfig: DbConfig, event: KmoreEvent, ctx?: Ctx): Promise<void> {
    assert(dbConfig)
    assert(event.type === 'queryResponse', event.type)
    assert(event.respRaw)

    await this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.queryResponse
    await (cb && cb(event, ctx))
  }

  protected async cbOnError(dbConfig: DbConfig, event: KmoreEvent, ctx?: Ctx): Promise<void> {
    assert(dbConfig)
    assert(event.type === 'queryError', event.type)

    await this.tracer(dbConfig, event, ctx)

    const cb = dbConfig.eventCallbacks?.queryError
    await (cb && cb(event, ctx))
  }


  protected getDbConfigByDbId(dbId: SourceName): DbConfig | undefined {
    assert(dbId)
    const dbConfig = this.sourceconfig?.dataSource[dbId]
    return dbConfig
  }

  protected async tracer(dbConfig: DbConfig, event: KmoreEvent, ctx?: Ctx): Promise<void> {
    if (! ctx) { return }

    assert(dbConfig)

    if (! dbConfig.enableTracing) { return }

    if (ctx.requestContext && ctx.requestContext.getAsync) {
      if (typeof dbConfig.sampleThrottleMs === 'undefined') {
        dbConfig.sampleThrottleMs = 3000
      }
      const logger = await ctx.requestContext.getAsync(TLogger)
      const trm = await ctx.requestContext.getAsync(TracerManager)

      const { queryUidSpanMap } = this
      const opts = {
        dbConfig,
        ev: event,
        logger,
        queryUidSpanMap,
        tagClass: '',
        trm,
      }

      switch (event.type) {
        case 'start':
          await processStartEvent(opts)
          break

        case 'query':
          await processQueryEvent(opts)
          break

        case 'queryResponse':
          await processQueryRespAndExEvent(opts)
          break

        case 'queryError':
          await processQueryRespAndExEvent(opts)
          await cleanAllQuerySpan(opts)
          break

        default:
          break
      }
    }
  }

}


export interface CreateInstanceOptions {
  cacheInstance?: boolean | undefined
}

