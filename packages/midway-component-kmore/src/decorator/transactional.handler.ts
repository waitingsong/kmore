import { Singleton } from '@midwayjs/core'
import { MConfig, DecoratorExecutorParamBase, DecoratorHandlerBase } from '@mwcp/share'

import { ConfigKey, KmorePropagationConfig } from '##/lib/types.js'

import { aroundAsync, aroundSync, genDecoratorExecutorOptionsAsync } from './transactional.helper.js'
import { DecoratorExecutorOptions, GenDecoratorExecutorOptionsExt } from './transactional.types.js'


@Singleton()
export class DecoratorHandlerTransactional extends DecoratorHandlerBase {
  @MConfig(ConfigKey.propagationConfig) protected readonly propagationConfig: KmorePropagationConfig

  override genExecutorParam(options: DecoratorExecutorParamBase) {
    if (! options.methodIsAsyncFunction) {
      return options
    }
    const optsExt: GenDecoratorExecutorOptionsExt = {
      propagationConfig: this.propagationConfig,
    }
    return genDecoratorExecutorOptionsAsync(options, optsExt)
  }

  override around(options: DecoratorExecutorOptions) {
    if (options.methodIsAsyncFunction) {
      return aroundAsync(options)
    }
    return aroundSync(options)
  }
}

