import {
  Logger,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/decorator'
import { ILogger } from '@midwayjs/logger'
import {
  Kmore,
  kmoreFactory,
  KmoreFactoryOpts,
} from 'kmore'

import { DbConfig, KmoreComponentConfig } from './types'

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

  init(componentConfig: KmoreComponentConfig): void {
    Object.entries(componentConfig).forEach(([dbId, row]) => {
      this.createInstance(dbId as DbId, row)
    })
  }

  createInstance<T = unknown>(dbId: DbId, dbConfig: DbConfig<T>): Kmore<T> | undefined {
    if (this.kmoreList.get(dbId)) {
      this.logger.info(`Database already initialized, identifier: "${dbId}"`)
      return
    }

    if (['appWork', 'agent'].includes(dbId) && typeof dbConfig !== 'object') { // egg pluging
      return
    }

    const km = this.createKmore<T>(dbId, dbConfig)
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

  private createKmore<T>(dbId: string, dbConfig: DbConfig<T>): Kmore<T> | undefined {
    const { config, dict } = dbConfig

    if (! config || ! Object.keys(config).length) {
      this.logger.warn(`Param dbConfig has no element, identifier: "${dbId}"`)
      return
    }

    const opts: KmoreFactoryOpts<T> = {
      config,
      dict,
      dbId,
    }
    const km = kmoreFactory<T>(opts)
    return km
  }

}

