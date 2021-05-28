import {
  Logger,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/decorator'
import { ILogger } from '@midwayjs/logger'
import { Kmore, kmoreFactory, KmoreFactoryOpts } from 'kmore'

import { DbConfig, KmoreComponentConfig } from './types'


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
    Object.entries(config).forEach(([identifier, row]) => {
      if (this.kmoreList.get(identifier)) {
        this.logger.info(`Database already initialized, identifier: "${identifier}"`)
        return
      }
      const km = this.initKmore(row)
      this.kmoreList.set(identifier, km)
    })
  }

  getAllInstances(): KmoreList {
    return this.kmoreList
  }

  getInstance(identifier: string): Kmore | undefined {
    return this.kmoreList.get(identifier)
  }

  private initKmore(dbConfig: DbConfig): Kmore {
    const { config, dict } = dbConfig
    const opts: KmoreFactoryOpts<unknown> = {
      config,
      dict,
    }
    const km = kmoreFactory(opts)
    return km
  }

}

