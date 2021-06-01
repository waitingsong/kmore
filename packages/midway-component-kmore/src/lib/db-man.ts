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
export class DbManager {

  @Logger() private readonly logger: ILogger

  private kmoreList: KmoreList = new Map<string, Kmore>()

  init(componentConfig: KmoreComponentConfig): void {
    Object.entries(componentConfig).forEach(([dbId, row]) => {
      this.createInstance(dbId, row)
    })
  }

  createInstance(dbId: string, dbConfig: DbConfig): Kmore | undefined {
    if (this.kmoreList.get(dbId)) {
      this.logger.info(`Database already initialized, identifier: "${dbId}"`)
      return
    }

    if (['appWork', 'agent'].includes(dbId) && typeof dbConfig !== 'object') { // egg pluging
      return
    }

    const km = this.createKmore(dbId, dbConfig)
    km && this.kmoreList.set(dbId, km)
    return km
  }

  getAllInstances(): KmoreList {
    return this.kmoreList
  }

  getInstance(dbId: string): Kmore | undefined {
    return this.kmoreList.get(dbId)
  }

  private createKmore(dbId: string, dbConfig: DbConfig): Kmore | undefined {
    const { config, dict } = dbConfig

    if (! config || ! Object.keys(config).length) {
      this.logger.warn(`Param dbConfig has no element, identifier: "${dbId}"`)
      return
    }

    const opts: KmoreFactoryOpts<unknown> = {
      config,
      dict,
      dbId,
    }
    const km = kmoreFactory(opts)
    return km
  }

}

