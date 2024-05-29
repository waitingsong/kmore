import { Singleton } from '@midwayjs/core'
import { MConfig, DecoratorExecutorParamBase, DecoratorHandlerBase, genError } from '@mwcp/share'

import { genCallerKey } from '##/lib/propagation/trx-status.helper.js'
import { ConfigKey, KmorePropagationConfig } from '##/lib/types.js'

import { afterReturn, before, genDecoratorExecutorOptionsAsync } from './transactional.helper.js'
import { DecoratorExecutorOptions, GenDecoratorExecutorOptionsExt } from './transactional.types.js'


@Singleton()
export class DecoratorHandlerTransactional extends DecoratorHandlerBase {
  @MConfig(ConfigKey.propagationConfig) protected readonly propagationConfig: KmorePropagationConfig

  // isEnable(options: DecoratorExecutorOptions): boolean {
  //   return true
  // }

  override genExecutorParam(options: DecoratorExecutorParamBase) {
    if (! options.methodIsAsyncFunction) {
      return options
    }
    const optsExt: GenDecoratorExecutorOptionsExt = {
      propagationConfig: this.propagationConfig,
    }
    return genDecoratorExecutorOptionsAsync(options, optsExt)
  }

  override before(options: DecoratorExecutorOptions) {
    // Do NOT use isAsyncFunction(options.method), result may not correct
    if (! options.methodIsAsyncFunction) { return }
    return before(options)
  }

  override afterReturn(options: DecoratorExecutorOptions) {
    if (! options.methodIsAsyncFunction) { return }

    return afterReturn(options)
      .catch(ex => this.afterThrow(options, ex))
  }

  override async afterThrow(options: DecoratorExecutorOptions, errorExt?: unknown): Promise<void> {
    const error = genError({
      error: errorExt ?? options.error,
      throwMessageIfInputUndefined: `[@mwcp/${ConfigKey.namespace}] ${ConfigKey.Transactional}() afterThrow error is undefined`,
      altMessage: `[@mwcp/${ConfigKey.namespace}] ${ConfigKey.Transactional}() decorator afterThrow error`,
    })

    const { callerKey, trxStatusSvc } = options
    const key = callerKey ?? genCallerKey(options.instanceName, options.methodName)
    const tkey = trxStatusSvc.retrieveUniqueTopCallerKey(key)
    if (tkey && tkey === key) {
      await trxStatusSvc.trxRollbackEntry(key)
    }
    throw error
  }
}

