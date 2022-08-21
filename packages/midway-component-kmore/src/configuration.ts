/* eslint-disable @typescript-eslint/no-extraneous-class */
import 'tsconfig-paths/register'
import { join } from 'path'

import { App, Config, Configuration, Inject } from '@midwayjs/decorator'
import * as jaeger from '@mw-components/jaeger'

import { DbSourceManager } from './lib/db-source-manager'
import { ConfigKey, KmoreSourceConfig } from './lib/index'
import { KmoreMiddleware } from './middleware/db-trx.middleware'

import type { Application } from '~/interface'


@Configuration({
  namespace: ConfigKey.namespace,
  importConfigs: [join(__dirname, 'config')],
  imports: [jaeger],
})
export class AutoConfiguration {
  @App() readonly app: Application

  @Inject() readonly dbSManager: DbSourceManager

  @Config() readonly kmoreSourceConfig: KmoreSourceConfig

  async onReady(): Promise<void> {
    // 全局db处理中间件，请求结束时回滚/提交所有本次请求未提交事务
    const mws = [KmoreMiddleware]
    this.app.useMiddleware(mws)

    return
  }

  async onStop(): Promise<void> {
    // const { timeoutWhenDestroy } = this.kmoreComponentConfig
    const out = 10000

    const p1 = new Promise<void>(done => setTimeout(done, out))
    const p2 = this.dbSManager.stop()
    await Promise.race([p1, p2])
      .catch((ex: Error) => {
        console.error(ex.message)
      })
  }
}

