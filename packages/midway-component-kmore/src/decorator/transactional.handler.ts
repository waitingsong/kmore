/* eslint-disable @typescript-eslint/no-misused-promises */
import assert from 'node:assert'

import {
  type AsyncContextManager,
  ASYNC_CONTEXT_KEY,
  ASYNC_CONTEXT_MANAGER_KEY,
  ApplicationContext,
  IMidwayContainer,
  Inject,
  Singleton,
} from '@midwayjs/core'
import { Application, Context, DecoratorExecutorParamBase, DecoratorHandlerBase, MConfig, genError } from '@mwcp/share'

import { TrxStatusService } from '##/lib/trx-status.service.js'
import { ConfigKey, KmorePropagationConfig } from '##/lib/types.js'

import { afterReturn, afterThrow, before, genDecoratorExecutorOptionsAsync } from './transactional.helper.js'
import { DecoratorExecutorOptions, GenDecoratorExecutorOptionsExt } from './transactional.types.js'


@Singleton()
export class DecoratorHandlerTransactional extends DecoratorHandlerBase {
  @ApplicationContext() protected readonly applicationContext: IMidwayContainer
  @Inject() protected readonly trxStatusSvc: TrxStatusService

  @MConfig(ConfigKey.propagationConfig) protected readonly propagationConfig: KmorePropagationConfig

  getWebContext(): Context | undefined {
    try {
      const contextManager: AsyncContextManager = this.applicationContext.get(
        ASYNC_CONTEXT_MANAGER_KEY,
      )
      const ctx = contextManager.active().getValue(ASYNC_CONTEXT_KEY) as Context | undefined
      return ctx
    }
    catch (ex) {
      // void ex
      console.warn(new Error('getWebContext() failed', { cause: ex }))
      return void 0
    }
  }

  getWebContextThenApp(): Context | Application {
    try {
      const webContext = this.getWebContext()
      assert(webContext, 'getActiveContext() webContext should not be null, maybe this calling is not in a request context')
      return webContext
    }
    catch (ex) {
      console.warn('getWebContextThenApp() failed', ex)
      return this.app
    }
  }

  // isEnable(options: DecoratorExecutorOptions): boolean {
  //   return true
  // }

  override genExecutorParam(options: DecoratorExecutorParamBase) {
    if (! options.methodIsAsyncFunction) {
      return options
    }
    const optsExt: GenDecoratorExecutorOptionsExt = {
      propagationConfig: this.propagationConfig,
      scope: this.getWebContextThenApp(),
      // scope: Symbol(Date.now()),
      trxStatusSvc: this.trxStatusSvc,
    }
    if (! options.webContext) {
      options.webContext = this.getWebContext()
    }
    return genDecoratorExecutorOptionsAsync(options, optsExt)
  }

  override before(options: DecoratorExecutorOptions) {
    // Do NOT use isAsyncFunction(options.method), result may not correct
    if (! options.methodIsAsyncFunction) {
      return
    }
    return before(options)
    // don't cache error here
    // .catch(ex => [
    //   this.afterThrow(options, ex),
    // ])
  }

  override afterReturn(options: DecoratorExecutorOptions) {
    if (! options.methodIsAsyncFunction) { return }
    return afterReturn(options)
  }

  override afterThrow(options: DecoratorExecutorOptions, errorExt?: unknown): never | Promise<never> {
    const error = genError({
      error: errorExt ?? options.error,
      throwMessageIfInputUndefined: `[@mwcp/${ConfigKey.namespace}] ${ConfigKey.Transactional}() afterThrow error is undefined`,
      altMessage: `[@mwcp/${ConfigKey.namespace}] ${ConfigKey.Transactional}() decorator afterThrow error`,
    })
    options.error = error
    return afterThrow(options, this.trxStatusSvc)
  }
}

