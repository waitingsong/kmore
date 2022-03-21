import {
  Config as _Config,
  Logger,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/decorator'
import { ILogger } from '@midwayjs/logger'
import { Logger as JLogger, TracerManager } from '@mw-components/jaeger'
import { createDbh } from 'kmore'
import { Knex } from 'knex'

import { ConfigKey } from './config'
import { KmoreComponent } from './kmore'
import { TracerKmoreComponent } from './tracer-kmore'
import {
  DbConfig,
  Config,
  KmoreComponentFactoryOpts,
  BindUnsubscribeEventFunc,
} from './types'

import { Context } from '~/interface'


type DbHosts = Map<string, Knex>

/**
 * Database 管理类
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class DbManager <DbId extends string = any> {

  @Logger() private readonly logger: ILogger

  @_Config(ConfigKey.config) private readonly config: Config

  private dbHosts: DbHosts = new Map()
  private dbConfigMap = new Map<string, DbConfig>()

  async connect<T>(
    dbId: string,
    dbConfig: DbConfig<T>,
    forceConnect = false,
  ): Promise<void> {

    if (this.dbHosts.get(dbId)) {
      return
    }
    else if (! dbConfig.autoConnect && ! forceConnect) {
      return
    }

    if (! Object.keys(dbConfig.config).length && ! Object.keys(dbConfig.dict).length) {
      console.info('config and dict of kmoreConfig element both empty, may default init config')
      return
    }

    const dbh = createDbh(dbConfig.config, dbConfig.enableTracing)
    this.dbHosts.set(dbId, dbh)
    this.dbConfigMap.set(dbId, dbConfig)
  }

  /**
   * Create one kmore instance
   */
  async create<T>(
    ctx: Context,
    dbId: DbId,
    bindUnsubscribeEventFunc: BindUnsubscribeEventFunc | false,
  ): Promise<KmoreComponent<T> | TracerKmoreComponent<T>> {

    const dbConfig = this.dbConfigMap.get(dbId) as DbConfig<T> | undefined
    if (! dbConfig) {
      throw new TypeError(`dbConfig empty of dbConfigMap.get("${dbId}")`)
    }
    const km = await this.createKmore<T>(ctx, dbId, dbConfig, bindUnsubscribeEventFunc)
    return km
  }

  getAllDbHosts(): DbHosts {
    return this.dbHosts
  }

  getDbHost(dbId: DbId): Knex | undefined {
    const dbh = this.dbHosts.get(dbId)
    // if (! dbh) {
    //   throw new Error(`dbhost instance not exists with dbId: "${dbId}"`)
    // }
    return dbh
  }


  private async createKmore<T>(
    ctx: Context,
    dbId: DbId,
    dbConfig: DbConfig<T>,
    bindUnsubscribeEventFunc: BindUnsubscribeEventFunc | false,
  ): Promise<KmoreComponent<T> | TracerKmoreComponent<T>> {

    const { config, enableTracing } = dbConfig

    if (! config || ! Object.keys(config).length) {
      throw new TypeError(`Param dbConfig has no element, identifier: "${dbId}"`)
    }

    let logger: JLogger | undefined = void 0
    let tracerManager: TracerManager | undefined = void 0

    if (enableTracing && ctx && ctx.requestContext && ctx.requestContext.getAsync) {
      logger = await ctx.requestContext.getAsync(JLogger)
      tracerManager = await ctx.requestContext.getAsync(TracerManager)
    }

    const dbh = this.getDbHost(dbId)
    const opts: KmoreComponentFactoryOpts<T> = {
      ctx,
      dbConfig,
      dbh,
      dbId,
      logger,
      tracerManager,
    }
    const km = enableTracing
      ? kmoreComponentFactory<T>(opts, TracerKmoreComponent, bindUnsubscribeEventFunc)
      : kmoreComponentFactory<T>(opts, KmoreComponent, bindUnsubscribeEventFunc)
    if (! dbh) {
      this.dbHosts.set(dbId, km.dbh)
    }
    return km
  }

  /**
   * Disconnect all dbhosts or specified
   */
  async destroy(
    dbId?: DbId,
  ): Promise<void> {
    const pms: Promise<void>[] = []

    const map = this.getAllDbHosts()
    for (const [id, dbh] of map) {
      if (dbId && dbId !== id) {
        continue
      }

      const pm = dbh.destroy().catch((ex: Error) => {
        this.logger.error(`destroy knex connection failed with identifier: "${id}":\n${(ex as Error).message}`)
      })
      pms.push(pm)
    }

    const { timeoutWhenDestroy } = this.config
    const tt = timeoutWhenDestroy && timeoutWhenDestroy >= 0
      ? timeoutWhenDestroy
      : 3000
    const timeout$ = new Promise<undefined>(done => setTimeout(done, tt))
    const t2$ = timeout$.then(() => {
      this.logger.warn(`dbManager.destroy() timeout in ${tt}(ms)`)
    })
    pms.push(t2$)
    return Promise.race(pms)
  }

}


export function kmoreComponentFactory<D>(
  options: KmoreComponentFactoryOpts<D>,
  component: typeof KmoreComponent | typeof TracerKmoreComponent,
  bindUnsubscribeEventFunc: BindUnsubscribeEventFunc | false,
): KmoreComponent<D> | TracerKmoreComponent<D> {

  const dbh: Knex = options.dbh
    ? options.dbh
    : createDbh(options.dbConfig.config, options.dbConfig.enableTracing)
  const km = new component<D>(
    options.dbConfig,
    dbh,
    options.ctx,
    options.logger,
    options.tracerManager,
  )

  if (typeof bindUnsubscribeEventFunc === 'function'
    && options.ctx
    && Object.keys(options.ctx).length) {
    bindUnsubscribeEventFunc(options.ctx, km)
  }
  return km
}


export type CreateResutMap <Key extends PropertyKey> =
  Map<Key, KmoreComponent<any> | TracerKmoreComponent<any> | undefined>
