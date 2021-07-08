import EventEmitter from 'events'

import {
  Logger,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/decorator'
import { ILogger } from '@midwayjs/logger'
import { Logger as JLogger } from '@mw-components/jaeger'
import { Kmore } from 'kmore'
import { Knex, knex } from 'knex'

import { KmoreComponent } from './kmore'
import { TracerKmoreComponent } from './tracer-kmore'
import { DbConfig, KmoreComponentConfig, KmoreComponentFactoryOpts, BindUnsubscribeEventFunc } from './types'

import { Context } from '~/interface'

/** dbId: Kmore */
type KmoreList = Map<string, KmoreComponent | TracerKmoreComponent>
type DbHosts = Map<string, Knex>

/**
 * Database 管理类
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class DbManager <DbId extends string = any> {

  @Logger() private readonly logger: ILogger

  private dbHosts: DbHosts = new Map()
  private kmoreList: KmoreList = new Map()
  private config: KmoreComponentConfig

  async connect(
    componentConfig: KmoreComponentConfig,
    forceConnect = false,
  ): Promise<void> {

    const { dbConfigs: database, defaultMaxListeners } = componentConfig

    EventEmitter.defaultMaxListeners = defaultMaxListeners && defaultMaxListeners >= 0
      ? defaultMaxListeners
      : 200

    Object.entries(database).forEach(([dbId, row]) => {
      if (this.dbHosts.get(dbId)) {
        return
      }
      else if (! row.autoConnect && ! forceConnect) {
        return
      }

      if (! Object.keys(row.config).length && ! Object.keys(row.dict).length) {
        console.info('config and dict of kmoreConfig element both empty, may default init config')
        return
      }

      const dbh = createDbh(row.config)
      this.dbHosts.set(dbId, dbh)
    })

    this.config = componentConfig
  }

  /**
   * Create kmore instances
   */
  async create(
    ctx: Context,
    componentConfig: KmoreComponentConfig,
    unsubscribeEventFunc: BindUnsubscribeEventFunc,
  ): Promise<void> {

    const { dbConfigs: database } = componentConfig
    for (const [dbId, row] of Object.entries(database)) {
      await this.createOne(ctx, dbId as DbId, row, unsubscribeEventFunc)
    }
  }

  /**
   * Create one kmore instance
   */
  async createOne<T = unknown>(
    ctx: Context,
    dbId: DbId,
    dbConfig: DbConfig<T>,
    bindUnsubscribeEventFunc: BindUnsubscribeEventFunc,
  ): Promise<Kmore<T> | undefined> {

    if (['appWork', 'agent'].includes(dbId) && typeof dbConfig !== 'object') { // egg pluging
      return
    }

    const km = await this.createKmore<T>(ctx, dbId, dbConfig, bindUnsubscribeEventFunc)
    km && this.kmoreList.set(dbId, km)
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

  getAllInstances(): KmoreList | undefined {
    return this.kmoreList
  }

  getInstance<T = unknown>(dbId: DbId): KmoreComponent<T> | TracerKmoreComponent<T> | undefined {
    const ret = this.kmoreList.get(dbId)
    return ret as KmoreComponent<T> | TracerKmoreComponent<T> | undefined
  }

  private async createKmore<T>(
    ctx: Context,
    dbId: DbId,
    dbConfig: DbConfig<T>,
    bindUnsubscribeEventFunc: BindUnsubscribeEventFunc,
  ): Promise<KmoreComponent<T> | TracerKmoreComponent<T> | undefined> {
    const { config, enableTracing } = dbConfig

    if (! config || ! Object.keys(config).length) {
      this.logger.warn(`Param dbConfig has no element, identifier: "${dbId}"`)
      return
    }

    const logger = await ctx.requestContext.getAsync(JLogger)
    const dbh = this.getDbHost(dbId)
    const opts: KmoreComponentFactoryOpts<T> = {
      ctx,
      dbConfig,
      dbh,
      dbId,
      logger,
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
   * Disconnect all dbhosts
   */
  async destroy(): Promise<void> {
    this.unsubscribeEventOfKmore()

    const pms: Promise<void>[] = []

    const map = this.getAllDbHosts()
    for (const [id, dbh] of map) {
      const pm = dbh.destroy().catch((ex) => {
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

  unsubscribeEventOfKmore(): void {
    this.kmoreList.forEach((kmoreComp) => {
      if (kmoreComp instanceof TracerKmoreComponent) {
        kmoreComp.unsubscribeEvent()
      }
      kmoreComp.unsubscribe()
    })
  }
}


export function kmoreComponentFactory<D>(
  options: KmoreComponentFactoryOpts<D>,
  component: typeof KmoreComponent | typeof TracerKmoreComponent,
  bindUnsubscribeEventFunc: BindUnsubscribeEventFunc,
): KmoreComponent<D> | TracerKmoreComponent<D> {
  const dbh: Knex = options.dbh ? options.dbh : createDbh(options.dbConfig.config)
  const km = new component<D>(options.dbConfig, dbh, options.ctx, options.logger)
  bindUnsubscribeEventFunc.bind(km)(options.ctx)
  return km
}

function createDbh(knexConfig: DbConfig['config']): Knex {
  return knex(knexConfig)
}
