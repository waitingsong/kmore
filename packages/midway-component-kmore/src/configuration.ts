/* eslint-disable @typescript-eslint/no-extraneous-class */
import 'tsconfig-paths/register'
import { join } from 'path'

import { App, Config, Configuration, Inject } from '@midwayjs/decorator'
import * as jaeger from '@mw-components/jaeger'

import { ConfigKey } from './lib/config'
import { DbSourceManager } from './lib/db-source-manager'
import { Config as KmoreComponentConfig } from './lib/types'

import { Application } from '~/interface'


@Configuration({
  namespace: ConfigKey.namespace,
  importConfigs: [join(__dirname, 'config')],
  imports: [jaeger],
})
export class AutoConfiguration {
  @App() readonly app: Application

  @Inject() readonly dbManager: DbSourceManager

  @Config(ConfigKey.config) readonly kmoreComponentConfig: KmoreComponentConfig

  async onReady(): Promise<void> {
    return
  }

  async onStop(): Promise<void> {
    const { timeoutWhenDestroy } = this.kmoreComponentConfig
    const out = timeoutWhenDestroy ?? 10000

    const p1 = new Promise<void>(done => setTimeout(done, out))
    const p2 = this.dbManager.stop()
    await Promise.race([p1, p2])
      .catch((ex: Error) => {
        console.error(ex.message)
      })
  }
}

