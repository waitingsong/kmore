import { Inject, Singleton } from '@midwayjs/core'
import { MConfig, DecoratorExecutorParamBase, DecoratorHandlerBase } from '@mwcp/share'

import { ConfigKey, KmorePropagationConfig } from '##/lib/types.js'

import { DecoratorExecutorOptions, GenDecoratorExecutorOptionsExt, decoratorExecutor, genDecoratorExecutorOptions } from './transactional.helper.js'


@Singleton()
export class DecoratorHandlerTransactional extends DecoratorHandlerBase {
  @MConfig(ConfigKey.propagationConfig) protected readonly propagationConfig: KmorePropagationConfig

  override async genExecutorParamAsync(options: DecoratorExecutorParamBase): Promise<DecoratorExecutorOptions> {
    const optsExt: GenDecoratorExecutorOptionsExt = {
      propagationConfig: this.propagationConfig,
    }
    const ret = genDecoratorExecutorOptions(options, optsExt)
    return ret
  }

  override async executorAsync(options: DecoratorExecutorOptions) {
    return decoratorExecutor(options)
  }

}

