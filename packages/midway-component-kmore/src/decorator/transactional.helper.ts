import assert from 'assert'

import { DecoratorExecutorParamBase, DecoratorMetaDataPayload, deepmerge } from '@mwcp/share'
import { PropagationType } from 'kmore'

import { initTransactionalOptions } from '##/lib/config.js'
import { KmorePropagationConfig, Msg, TransactionalOptions } from '##/lib/types.js'


export interface DecoratorExecutorOptions extends DecoratorExecutorParamBase<TransactionalArgs> {
  propagationConfig: KmorePropagationConfig
}

export async function decoratorExecutor(options: DecoratorExecutorOptions): Promise<unknown> {


}


export interface GenDecoratorExecutorOptionsExt {
  propagationConfig: KmorePropagationConfig
}

export function genDecoratorExecutorOptions<T extends object>(
  optionsBase: DecoratorExecutorParamBase<T>,
  optionsExt: GenDecoratorExecutorOptionsExt,
): DecoratorExecutorOptions {

  const { mergedDecoratorParam } = optionsBase

  assert(optionsExt.propagationConfig, Msg.propagationConfigIsUndefined)

  const initArgs = {
    propagationType: PropagationType.REQUIRED,
    propagationOptions: {
      ...initTransactionalOptions,
    },
  }

  const args = deepmerge.all([
    initArgs,
    mergedDecoratorParam ?? {},
  ]) as DecoratorMetaDataPayload<TransactionalArgs>

  const ret: DecoratorExecutorOptions = {
    ...optionsBase,
    ...optionsExt,
    mergedDecoratorParam: args,
  }
  return ret
}


export interface TransactionalArgs {
  /**
   * @default {@link PropagationType.REQUIRED}
   */
  propagationType: PropagationType | undefined
  /**
   * @default {@link TransactionalOptions}
   */
  propagationOptions: Partial<TransactionalOptions> | undefined
}
