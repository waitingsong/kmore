import 'tsconfig-paths/register'
import assert from 'node:assert'
import { join } from 'node:path'

import {
  App,
  Config,
  Configuration,
  ILifeCycle,
  ILogger,
  Inject,
  Logger,
  MidwayDecoratorService,
} from '@midwayjs/core'
import { CacheManager } from '@mwcp/cache'
import { TraceInit } from '@mwcp/otel'
import {
  Application,
  IMidwayContainer,
  RegisterDecoratorHandlerOptions,
  registerDecoratorHandler,
} from '@mwcp/share'
import { sleep } from '@waiting/shared-core'

import {
  METHOD_KEY_Transactional,
  genDecoratorExecutorOptions,
  transactionalDecoratorExecutor,
} from './decorator/decorator.helper'
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

  @Logger() logger: ILogger

  @Config() readonly kmoreSourceConfig: KmoreSourceConfig

  @Config(ConfigKey.propagationConfig) protected readonly propagationConfig: KmorePropagationConfig

  @Inject() readonly dbSManager: DbSourceManager

  @Inject() decoratorService: MidwayDecoratorService

  @Inject() cacheManager: CacheManager

  @TraceInit(`INIT ${ConfigKey.componentName}.onReady`)
  async onReady(container: IMidwayContainer): Promise<void> {
    void container
    assert(this.cacheManager, 'cacheManager is not ready')

    // 全局db处理中间件，请求结束时回滚/提交所有本次请求未提交事务
    registerMiddleware(this.app, KmoreMiddleware)
    // registerMethodHandler(this.decoratorService, this.propagationConfig)

    const optsCacheable: RegisterDecoratorHandlerOptions = {
      decoratorKey: METHOD_KEY_Transactional,
      decoratorService: this.decoratorService,
      genDecoratorExecutorOptionsFn: genDecoratorExecutorOptions,
      decoratorExecutor: transactionalDecoratorExecutor,
    }
    const aroundFactoryOptions = {
      config: this.propagationConfig,
    }

    registerDecoratorHandler(optsCacheable, aroundFactoryOptions)
  }

  async onStop(container: IMidwayContainer): Promise<void> {
    void container
    const time = 2
    await sleep(time * 1000)
    this.logger.info(`[${ConfigKey.componentName}] onStop()`)

    // const { timeoutWhenDestroy } = this.kmoreComponentConfig
    const out = 10000

    const p1 = new Promise<void>(done => setTimeout(done, out))
    const p2 = this.dbSManager.stop()
    await Promise.race([p1, p2])
      .catch((ex: Error) => {
        console.error(ex.message)
      })
    this.logger.info(`[${ConfigKey.componentName}] onStop() doen`)
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
