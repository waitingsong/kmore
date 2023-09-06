import assert from 'node:assert'

import {
  App,
  Config,
  Configuration,
  MidwayEnvironmentService,
  MidwayInformationService,
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
  RegisterDecoratorHandlerParam,
  registerDecoratorHandler,
  registerMiddleware,
} from '@mwcp/share'
import { sleep } from '@waiting/shared-core'


import * as DefulatConfig from './config/config.default.js'
import * as LocalConfig from './config/config.local.js'
import * as UnittestConfig from './config/config.unittest.js'
import {
  METHOD_KEY_Transactional,
  genDecoratorExecutorOptions,
  transactionalDecoratorExecutor,
} from './decorator/decorator.helper.js'
import { useComponents } from './imports.js'
import { DbSourceManager } from './lib/db-source-manager.js'
import { ConfigKey, KmorePropagationConfig, KmoreSourceConfig } from './lib/index.js'
import { KmoreMiddleware } from './middleware/index.middleware.js'


@Configuration({
  namespace: ConfigKey.namespace,
  importConfigs: [
    {
      default: DefulatConfig,
      local: LocalConfig,
      unittest: UnittestConfig,
    },
  ],
  imports: useComponents,
})
export class AutoConfiguration implements ILifeCycle {

  @App() readonly app: Application

  @Inject() protected readonly environmentService: MidwayEnvironmentService
  @Inject() protected readonly informationService: MidwayInformationService
  @Logger() protected readonly logger: ILogger

  @Config() readonly kmoreSourceConfig: KmoreSourceConfig

  @Config(ConfigKey.propagationConfig) protected readonly propagationConfig: KmorePropagationConfig

  @Inject() readonly dbSManager: DbSourceManager

  @Inject() decoratorService: MidwayDecoratorService

  @Inject() cacheManager: CacheManager

  @TraceInit({ namespace: ConfigKey.namespace })
  async onReady(container: IMidwayContainer): Promise<void> {
    void container
    assert(this.cacheManager, 'cacheManager is not ready')

    // 全局db处理中间件，请求结束时回滚/提交所有本次请求未提交事务
    registerMiddleware(this.app, KmoreMiddleware)

    const optsCacheable: RegisterDecoratorHandlerParam = {
      decoratorKey: METHOD_KEY_Transactional,
      decoratorService: this.decoratorService,
      fnDecoratorExecutorAsync: transactionalDecoratorExecutor,
      fnDecoratorExecutorSync: 'bypass',
      fnGenDecoratorExecutorParam: genDecoratorExecutorOptions,
    }
    const aroundFactoryOptions = {
      webApp: this.app,
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

