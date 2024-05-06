import { Singleton } from '@midwayjs/core'
import { MConfig, DecoratorExecutorParamBase, DecoratorHandlerBase } from '@mwcp/share'

import { ConfigKey, KmorePropagationConfig } from '##/lib/types.js'

import { decoratorExecutorAsync, decoratorExecutorSync, genDecoratorExecutorOptionsAsync } from './transactional.helper.js'
import { DecoratorExecutorOptions, GenDecoratorExecutorOptionsExt } from './transactional.types.js'


@Singleton()
export class DecoratorHandlerTransactional extends DecoratorHandlerBase {
  @MConfig(ConfigKey.propagationConfig) protected readonly propagationConfig: KmorePropagationConfig

  override async genExecutorParamAsync(options: DecoratorExecutorParamBase): Promise<DecoratorExecutorOptions> {
    const optsExt: GenDecoratorExecutorOptionsExt = {
      propagationConfig: this.propagationConfig,
    }
    const ret = genDecoratorExecutorOptionsAsync(options, optsExt)
    return ret
  }

  override async executorAsync(options: DecoratorExecutorOptions) {
    return decoratorExecutorAsync(options)
  }

  /**
   * @Caution Will not execute any method including database operations, just return the result
   */
  override executorSync(options: DecoratorExecutorOptions) {
    return decoratorExecutorSync(options)
  }
}

