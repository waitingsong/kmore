/* eslint-disable @typescript-eslint/no-extraneous-class */
import 'tsconfig-paths/register'
import EventEmitter from 'events'
import { join } from 'path'

import { App, Config, Configuration, Inject } from '@midwayjs/decorator'

import { ConfigKey } from './lib/config'
import { DbManager } from './lib/db-man'
import { Config as KmoreComponentConfig } from './lib/types'

import { Application } from '~/interface'


@Configuration({
  namespace: ConfigKey.namespace,
  importConfigs: [join(__dirname, 'config')],
})
export class AutoConfiguration {
  @App() readonly app: Application

  @Inject() readonly dbManager: DbManager

  @Config(ConfigKey.config) readonly kmoreComponentConfig: KmoreComponentConfig

  async onReady(): Promise<void> {
    const { defaultMaxListeners } = this.kmoreComponentConfig

    let maxListeners = defaultMaxListeners && defaultMaxListeners >= 0
      ? defaultMaxListeners
      : 200
    if (process.env.CI || process.env.MIDWAY_SERVER_ENV === 'unittest' || process.env.NODE_ENV === 'unnittest') {
      maxListeners += 200
    }
    EventEmitter.defaultMaxListeners = maxListeners
  }

  async onStop(): Promise<void> {
    const { dbManager } = this
    if (dbManager) {
      await dbManager.destroy()
    }
  }
}

