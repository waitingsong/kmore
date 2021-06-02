import {
  Logger,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/decorator'
import { ILogger } from '@midwayjs/logger'
import { IMidwayWebContext as Context } from '@midwayjs/web'
import { Kmore } from 'kmore'
import { Knex, knex } from 'knex'

import { KmoreComponent } from './kmore'
import { TracedKmoreComponent } from './traced-kmore'
import { DbConfig, KmoreComponentConfig, KmoreComponentFactoryOpts } from './types'

/** dbId: Kmore */
type KmoreList = Map<string, Kmore>

/**
 * Database 管理类
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class DbManager <DbId extends string = any> {

  @Logger() private readonly logger: ILogger

  private kmoreList: KmoreList = new Map<string, Kmore>()

  init(
    componentConfig: KmoreComponentConfig,
    ctx?: Context,
  ): void {
    Object.entries(componentConfig).forEach(([dbId, row]) => {
      this.createInstance(dbId as DbId, row, ctx)
    })
  }

  createInstance<T = unknown>(
    dbId: DbId,
    dbConfig: DbConfig<T>,
    ctx?: Context,
  ): Kmore<T> | undefined {
    if (this.kmoreList.get(dbId)) {
      this.logger.info(`Database already initialized, identifier: "${dbId}"`)
      return
    }

    if (['appWork', 'agent'].includes(dbId) && typeof dbConfig !== 'object') { // egg pluging
      return
    }

    const km = this.createKmore<T>(dbId, dbConfig, ctx)
    km && this.kmoreList.set(dbId, km)
    return km
  }

  getAllInstances(): KmoreList {
    return this.kmoreList
  }

  getInstance<T = unknown>(dbId: DbId): Kmore<T> {
    const km = this.kmoreList.get(dbId)
    if (! km) {
      throw new Error(`Kmore instance not exists with dbId: "${dbId}"`)
    }
    return km as Kmore<T>
  }

  private createKmore<T>(
    dbId: string,
    dbConfig: DbConfig<T>,
    ctx?: Context,
  ): Kmore<T> | undefined {
    const { config, enableTracing } = dbConfig

    if (! config || ! Object.keys(config).length) {
      this.logger.warn(`Param dbConfig has no element, identifier: "${dbId}"`)
      return
    }

    const opts: KmoreComponentFactoryOpts<T> = {
      dbConfig,
      dbId,
      ctx,
    }
    const km = enableTracing
      ? kmoreComponentFactory<T>(opts, TracedKmoreComponent)
      : kmoreComponentFactory<T>(opts, KmoreComponent)
    return km
  }

}


export function kmoreComponentFactory<D>(
  options: KmoreComponentFactoryOpts<D>,
  component: typeof KmoreComponent | typeof TracedKmoreComponent,
): KmoreComponent<D> {
  const dbh: Knex = options.dbh ? options.dbh : knex(options.dbConfig.config)
  const km = new component<D>(options.dbConfig, dbh, options.ctx)
  return km
}
