/* eslint-disable node/no-extraneous-import */
/* eslint-disable @typescript-eslint/no-extraneous-class */
import 'tsconfig-paths/register'

import { join } from 'path'

import {
  App,
  Config,
  Configuration,
  Inject,
} from '@midwayjs/decorator'
import { IMidwayWebApplication } from '@midwayjs/web'

import { DbManager } from './lib/db-man'
import { KmoreComponentConfig } from './lib/types'


const namespace = 'kmore'

@Configuration({
  namespace,
  importConfigs: [join(__dirname, 'config')],
})
export class AutoConfiguration {
  @App() readonly app: IMidwayWebApplication

  @Inject() readonly dbManager: DbManager

  @Config('kmore') readonly kmoreConfig: KmoreComponentConfig

  async onReady(): Promise<void> {
    try {
      await this.dbManager.connect(this.kmoreConfig)
    }
    catch (ex) {
      this.app.logger.error((ex as Error).message)
      throw ex
    }
  }

  async onStop(): Promise<void> {
    const { dbManager } = this
    if (dbManager) {
      await dbManager.destroy()
    }
  }
}

