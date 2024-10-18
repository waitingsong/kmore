import {
  App,
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
import { TraceInit } from '@mwcp/otel'
import {
  Application,
  IMidwayContainer,
  MConfig,
  deleteRouter,
  registerMiddleware,
} from '@mwcp/share'

import * as DefaultConfig from './config/config.default.js'
import * as LocalConfig from './config/config.local.js'
import * as UnittestConfig from './config/config.unittest.js'
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

  @MConfig(ConfigKey.config) readonly config: Config
  @MConfig() readonly kmoreSourceConfig: KmoreSourceConfig

  @MConfig(ConfigKey.propagationConfig) protected readonly propagationConfig: KmorePropagationConfig

  @Inject() readonly dbSourceManager: DbSourceManager

  @Inject() decoratorService: MidwayDecoratorService

  async onConfigLoad(): Promise<void> {
    if (! this.config.enableDefaultRoute) {
      await deleteRouter(`/_${ConfigKey.namespace}`, this.webRouterService)
    }
  }

  @TraceInit({ namespace: ConfigKey.namespace })
  async onReady(container: IMidwayContainer): Promise<void> {
    void container

    // 全局db处理中间件，请求结束时回滚/提交所有本次请求未提交事务
    registerMiddleware(this.app, KmoreMiddleware)
  }

  @TraceInit({ namespace: ConfigKey.namespace })
  async onStop(container: IMidwayContainer): Promise<void> {
    void container
    this.logger.info(`[${ConfigKey.componentName}] stopping`)

    // const { timeoutWhenDestroy } = this.kmoreComponentConfig
    const out = 10000

    const p1 = new Promise<void>(done => setTimeout(done, out))
    const p2 = this.dbSourceManager.stop()
    await Promise.race([p1, p2])
      .catch((ex: Error) => {
        console.error(ex.message)
      })
    this.logger.info(`[${ConfigKey.componentName}] stopped`)
  }

}

