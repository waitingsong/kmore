/* eslint-disable node/no-extraneous-import */
/* eslint-disable @typescript-eslint/no-extraneous-class */
import { join } from 'path'

import { App, Config, Configuration, Logger } from '@midwayjs/decorator'
import { ILogger } from '@midwayjs/logger'
import { IMidwayWebApplication } from '@midwayjs/web'
import { identity } from 'rxjs'

import { DbManager } from './lib/kmore'
import { KmoreComponentConfig } from './lib/types'


const namespace = 'kmore'

@Configuration({
  namespace,
  importConfigs: [join(__dirname, 'config')],
})
export class AutoConfiguration {
  @App() readonly app: IMidwayWebApplication
  @Logger() private readonly logger: ILogger

  @Config('kmore') readonly kmoreConfig: KmoreComponentConfig

  private dbManager: DbManager | undefined

  async onReady(): Promise<void> {
    this.dbManager = this.app.dbManager
  }

  async onStop(): Promise<void> {
    if (this.dbManager) {
      const map = this.dbManager.getAllInstance()
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
