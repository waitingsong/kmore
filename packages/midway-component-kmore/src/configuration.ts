import 'tsconfig-paths/register'
import { join } from 'node:path'

import { ILifeCycle, MidwayDecoratorService } from '@midwayjs/core'
import { App, Config, Configuration, Inject } from '@midwayjs/decorator'
import type { Application, IMidwayContainer } from '@mwcp/share'

import { registerMethodHandler } from './decorator/method-decorator'
import { useComponents } from './imports'
import { DbSourceManager } from './lib/db-source-manager'
import { ConfigKey, KmorePropagationConfig, KmoreSourceConfig } from './lib/index'
import { KmoreMiddleware } from './middleware/db-trx.middleware'


@Configuration({
  namespace: ConfigKey.namespace,
  importConfigs: [join(__dirname, 'config')],
  imports: useComponents,
})
export class AutoConfiguration implements ILifeCycle {

  @App() readonly app: Application

  @Config() readonly kmoreSourceConfig: KmoreSourceConfig

  @Config(ConfigKey.propagationConfig) protected readonly propagationConfig: KmorePropagationConfig

  @Inject() readonly dbSManager: DbSourceManager

  @Inject() decoratorService: MidwayDecoratorService


  async onReady(): Promise<void> {
    // 全局db处理中间件，请求结束时回滚/提交所有本次请求未提交事务
    registerMiddleware(this.app, KmoreMiddleware)
    registerMethodHandler(this.decoratorService, this.propagationConfig)
  }

  async onStop(_container: IMidwayContainer): Promise<void> {
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


function registerMiddleware(
  app: Application,
  middleware: { name: string },
  postion: 'first' | 'last' = 'last',
): void {

  const mwNames = app.getMiddleware().getNames()
  if (mwNames.includes(middleware.name)) {
    return
  }

  switch (postion) {
    case 'first':
      // @ts-ignore
      app.getMiddleware().insertFirst(middleware)
      break
    case 'last':
      // @ts-ignore
      app.getMiddleware().insertLast(middleware)
      break
  }
}
