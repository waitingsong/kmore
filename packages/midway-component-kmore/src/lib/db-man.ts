import {
  Logger,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/decorator'
import { ILogger } from '@midwayjs/logger'
import { IMidwayWebContext as Context } from '@midwayjs/web'
import { Logger as JLogger } from '@mw-components/jaeger'
import { Kmore } from 'kmore'
import { Knex, knex } from 'knex'

import { KmoreComponent } from './kmore'
import { TracerKmoreComponent } from './tracer-kmore'
import { DbConfig, KmoreComponentConfig, KmoreComponentFactoryOpts } from './types'

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

  connect(
    componentConfig: KmoreComponentConfig,
    forceConnect = false,
  ): void {

    Object.entries(componentConfig).forEach(([dbId, row]) => {
      if (this.dbHosts.get(dbId)) {
        return
      }
      else if (! row.autoConnect && ! forceConnect) {
        return
      }
      const dbh = createDbh(row.config)
      this.dbHosts.set(dbId, dbh)
    })
  }

  /**
   * Create kmore instances
   */
  create(
    componentConfig: KmoreComponentConfig,
    ctx?: Context,
    logger?: JLogger,
  ): void {
    Object.entries(componentConfig).forEach(([dbId, row]) => {
      this.createOne(dbId as DbId, row, ctx, logger)
    })
  }

  /**
   * Create one kmore instance
   */
  createOne<T = unknown>(
    dbId: DbId,
    dbConfig: DbConfig<T>,
    ctx?: Context,
    logger?: JLogger,
  ): Kmore<T> | undefined {

    if (['appWork', 'agent'].includes(dbId) && typeof dbConfig !== 'object') { // egg pluging
      return
    }

    const km = this.createKmore<T>(dbId, dbConfig, ctx, logger)
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

  private createKmore<T>(
    dbId: DbId,
    dbConfig: DbConfig<T>,
    ctx?: Context,
    logger?: JLogger,
  ): KmoreComponent<T> | TracerKmoreComponent<T> | undefined {
    const { config, enableTracing } = dbConfig

    if (! config || ! Object.keys(config).length) {
      this.logger.warn(`Param dbConfig has no element, identifier: "${dbId}"`)
      return
    }

    const dbh = this.getDbHost(dbId)
    const opts: KmoreComponentFactoryOpts<T> = {
      dbConfig,
      dbh,
      dbId,
      ctx,
      logger,
    }
    const km = enableTracing
      ? kmoreComponentFactory<T>(opts, TracerKmoreComponent)
      : kmoreComponentFactory<T>(opts, KmoreComponent)
    if (! dbh) {
      this.dbHosts.set(dbId, km.dbh)
    }
    return km
  }

}


export function kmoreComponentFactory<D>(
  options: KmoreComponentFactoryOpts<D>,
  component: typeof KmoreComponent | typeof TracerKmoreComponent,
): KmoreComponent<D> | TracerKmoreComponent<D> {
  const dbh: Knex = options.dbh ? options.dbh : createDbh(options.dbConfig.config)
  const km = new component<D>(options.dbConfig, dbh, options.ctx, options.logger)
  return km
}

function createDbh(knexConfig: DbConfig['config']): Knex {
  return knex(knexConfig)
}
