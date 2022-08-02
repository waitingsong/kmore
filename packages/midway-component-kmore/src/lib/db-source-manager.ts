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
import { Logger as TLogger, TracerManager } from '@mw-components/jaeger'
import {
  EventCallbacks,
  Kmore,
  KmoreEvent,
  KmoreFactory,
  KmoreFactoryOpts,
  QuerySpanInfo,
} from 'kmore'

import { Context } from '../interface'

import { ConfigKey } from './config'
import {
  processStartEvent,
  processQueryEvent,
  processQueryRespAndExEvent,
  cleanAllQuerySpan,
} from './tracer-helper'
import { DataSourceConfig, DbConfig } from './types'


@Provide()
@Scope(ScopeEnum.Singleton)
export class DbSourceManager<SourceName extends string = string, D = unknown, Ctx = Context>
  extends DataSourceManager<Kmore | undefined> {

  // @_Config(ConfigKey.config) private readonly config: Config
  @_Config(ConfigKey.dataSourceConfig) private readonly dataSourceconfig: DataSourceConfig<SourceName>

  @_Logger() private readonly logger: ILogger

  @Inject() baseDir: string

  public queryUidSpanMap = new Map<string, QuerySpanInfo>()

  declare dataSource: Map<SourceName, Kmore<D, Ctx>>

  declare getDataSource: <Db = D>(dataSourceName: SourceName)
  => string extends SourceName ? Kmore<Db, Ctx> | undefined : Kmore<Db, Ctx>

  declare createInstance: <Db = D>(config: DbConfig<D, Ctx>, clientName: SourceName)
  => Promise<Kmore<Db, Ctx> | void>

  @Init()
  async init(): Promise<void> {
    if (! this.dataSourceconfig) {
      this.logger.warn('dataSourceConfig is not defined')
      return
    }
    assert(this.dataSourceconfig.dataSource, 'dataSourceconfig must contains dataSource property')
    // 需要注意的是，这里第二个参数需要传入一个实体类扫描地址
    await this.initDataSource(this.dataSourceconfig, this.baseDir)
  }


  /** 创建单个实例 */
  protected async createDataSource<Db>(
    options: DbConfig<Db, Ctx>,
    dataSourceName: SourceName,
  ): Promise<Kmore<Db, Ctx>> {

    const globalEventCbs: EventCallbacks = {
      start: (event: KmoreEvent, ctx?: Ctx) => this.cbOnStart(event, ctx),
      query: (event: KmoreEvent, ctx?: Ctx) => this.cbOnQuery(event, ctx),
      queryResponse: (event: KmoreEvent, ctx?: Ctx) => this.cbOnResp(event, ctx),
      queryError: (event: KmoreEvent, ctx?: Ctx) => this.cbOnError(event, ctx),
    }
    const opts: KmoreFactoryOpts<Db, Ctx> = {
      dbId: dataSourceName,
      ...options,
      eventCallbacks: globalEventCbs,
    }

    return KmoreFactory<Db, Ctx>(opts)
  }


  getName(): string {
    return 'dbSourceManager'
  }

  async checkConnected(dataSource: Kmore): Promise<boolean> {
    assert(dataSource)
    const { dbh } = dataSource

    try {
      return dbh.raw('SHOW TIME ZONE')
        .then((rows) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (rows && rows.rows.length > 0) {
            return true
          }
          return false
        })
    }
    catch {
      void 0
    }
    return false
  }

  override async destroyDataSource(dataSource: Kmore): Promise<void> {
    if (await this.checkConnected(dataSource)) {
      try {
        await dataSource.dbh.destroy()
      }
      catch (ex: unknown) {
        this.logger.error(
          `Destroy knex connection failed with identifier: "${dataSource.instanceId.toString()}" :
          \n${(ex as Error).message}`,
        )
      }
    }
  }


  protected async cbOnStart(event: KmoreEvent, ctx?: Ctx): Promise<void> {
    assert(event.type === 'start', event.type)
    assert(event.queryBuilder)

    await this.tracer(event, ctx)

    const { dbId } = event
    const dbConfig = this.getDbConfigByDbId(dbId as SourceName)
    assert(dbConfig, `dbConfig not found for dbId: ${dbId}`)

    const cb = dbConfig.eventCallbacks?.start
    await (cb && cb(event, ctx))
  }

  protected async cbOnQuery(event: KmoreEvent, ctx?: Ctx): Promise<void> {
    assert(event.type === 'query', event.type)
    assert(event.data)

    await this.tracer(event, ctx)

    const { dbId } = event
    const dbConfig = this.getDbConfigByDbId(dbId as SourceName)
    assert(dbConfig, `dbConfig not found for dbId: ${dbId}`)

    const cb = dbConfig.eventCallbacks?.query
    await (cb && cb(event, ctx))
  }

  protected async cbOnResp(event: KmoreEvent, ctx?: Ctx): Promise<void> {
    assert(event.type === 'queryResponse', event.type)
    assert(event.respRaw)

    await this.tracer(event, ctx)

    const { dbId } = event
    const dbConfig = this.getDbConfigByDbId(dbId as SourceName)
    assert(dbConfig, `dbConfig not found for dbId: ${dbId}`)

    const cb = dbConfig.eventCallbacks?.queryResponse
    await (cb && cb(event, ctx))
  }

  protected async cbOnError(event: KmoreEvent, ctx?: Ctx): Promise<void> {
    assert(event.type === 'queryError', event.type)

    await this.tracer(event, ctx)

    const { dbId } = event
    assert(dbId)
    const dbConfig = this.getDbConfigByDbId(dbId as SourceName)
    assert(dbConfig, `dbConfig not found for dbId: ${dbId}`)

    const cb = dbConfig.eventCallbacks?.queryError
    await (cb && cb(event, ctx))
  }


  protected getDbConfigByDbId(dbId: SourceName): DbConfig | undefined {
    assert(dbId)
    const dbConfig = this.dataSourceconfig.dataSource[dbId]
    return dbConfig
  }

  protected async tracer(event: KmoreEvent, ctx?: Ctx): Promise<void> {
    if (! ctx) { return }

    const { dbId } = event
    const dbConfig = this.getDbConfigByDbId(dbId as SourceName)
    assert(dbConfig, `dbConfig not found for dbId: ${dbId}`)

    if (dbConfig.enableTracing) {
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (ctx.requestContext && ctx.requestContext.getAsync) {
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const logger = await ctx.requestContext.getAsync(TLogger) as TLogger
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const trm = await ctx.requestContext.getAsync(TracerManager) as TracerManager

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

}


