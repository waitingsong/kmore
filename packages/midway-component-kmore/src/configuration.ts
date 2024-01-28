import assert from 'node:assert'

import {
  App,
  Config as _Config,
  Configuration,
  ILifeCycle,
  ILogger,
  Inject,
  Logger,
  MidwayDecoratorService,
  MidwayEnvironmentService,
  MidwayInformationService,
  MidwayWebRouterService,
} from '@midwayjs/core'
import { CacheManager } from '@mwcp/cache'
import { TraceInit } from '@mwcp/otel'
import {
  Application,
  IMidwayContainer,
  RegisterDecoratorHandlerParam,
  registerDecoratorHandler,
  registerMiddleware,
  deleteRouter,
} from '@mwcp/share'
import { sleep } from '@waiting/shared-core'


import * as DefaultConfig from './config/config.default.js'
import * as LocalConfig from './config/config.local.js'
import * as UnittestConfig from './config/config.unittest.js'
import {
  METHOD_KEY_Transactional,
  genDecoratorExecutorOptions,
  transactionalDecoratorExecutor,
} from './decorator/decorator.helper.js'
import { useComponents } from './imports.js'
import { DbSourceManager } from './lib/db-source-manager.js'
import { Config, ConfigKey, KmorePropagationConfig, KmoreSourceConfig } from './lib/index.js'
import { KmoreMiddleware } from './middleware/index.middleware.js'


@Configuration({
  namespace: ConfigKey.namespace,
  importConfigs: [
    {
      default: DefaultConfig,
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
  @Inject() protected readonly webRouterService: MidwayWebRouterService

  @Logger() protected readonly logger: ILogger

  @_Config(ConfigKey.config) readonly config: Config
  @_Config() readonly kmoreSourceConfig: KmoreSourceConfig

  @_Config(ConfigKey.propagationConfig) protected readonly propagationConfig: KmorePropagationConfig

  @Inject() readonly dbSManager: DbSourceManager

  @Inject() decoratorService: MidwayDecoratorService

  @Inject() cacheManager: CacheManager

  async onConfigLoad(): Promise<void> {
    if (! this.config.enableDefaultRoute) {
      await deleteRouter(`/_${ConfigKey.namespace}`, this.webRouterService)
    }
  }

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

  @TraceInit({ namespace: ConfigKey.namespace })
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

