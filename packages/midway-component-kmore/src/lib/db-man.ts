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

  init(config: KmoreComponentConfig): void {
    Object.entries(config).forEach(([dbId, row]) => {
      this.createInstance(dbId, row)
    })
  }

  createInstance(dbId: string, row: DbConfig): Kmore | undefined {
    if (this.kmoreList.get(dbId)) {
      this.logger.info(`Database already initialized, identifier: "${dbId}"`)
      return
    }
    const km = this.createKmore(row)
    this.kmoreList.set(dbId, km)
    return km
  }

  getAllInstances(): KmoreList {
    return this.kmoreList
  }

  getInstance(dbId: string): Kmore | undefined {
    return this.kmoreList.get(dbId)
  }

  private createKmore(dbConfig: DbConfig): Kmore {
    const { config, dict } = dbConfig
    const opts: KmoreFactoryOpts<unknown> = {
      config,
      dict,
    }
    const km = kmoreFactory(opts)
    return km
  }

}

