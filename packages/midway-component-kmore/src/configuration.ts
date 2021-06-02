/* eslint-disable node/no-extraneous-import */
/* eslint-disable @typescript-eslint/no-extraneous-class */
import { join } from 'path'

import {
  App,
  Config,
  Configuration,
  Inject,
  Logger,
} from '@midwayjs/decorator'
import { ILogger } from '@midwayjs/logger'
import {
  IMidwayWebApplication,
  IMidwayWebContext,
} from '@midwayjs/web'

import { DbManager } from './lib/db-man'
import { KmoreComponentConfig } from './lib/types'


const namespace = 'kmore'

@Configuration({
  namespace,
  importConfigs: [join(__dirname, 'config')],
})
export class AutoConfiguration {
  @App() readonly app: IMidwayWebApplication
  @Logger() private readonly logger: ILogger

  @Inject() readonly ctx: IMidwayWebContext
  @Inject() readonly dbManager: DbManager

  @Config('kmore') readonly kmoreConfig: KmoreComponentConfig

  async onReady(): Promise<void> {
    this.dbManager.init(this.kmoreConfig)
    // @ts-expect-error
    this.app.dbManager = this.dbManager
  }

  async onStop(): Promise<void> {
    const { dbManager } = this
    if (dbManager) {
      const map = dbManager.getAllInstances()
      for (const [id, inst] of map) {
        try {
          await inst.dbh.destroy()
        }
        catch (ex) {
          this.logger.warn(`destroy knex connection failed with identifier: "${id}"`)
        }
      }
    }
  }
}

