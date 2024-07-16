import { customDecoratorFactory } from '@mwcp/share'

import { DecoratorHandlerTransactional } from './transactional.handler.js'
import type { TransactionalArgs } from './transactional.types.js'
import {
  TRX_CLASS_KEY,
  METHOD_KEY_Transactional,
} from './transactional.types.js'


export {
  classDecoratorKeyMap,
  methodDecoratorKeyMap,
} from './transactional.types.js'
export {
  type TransactionalArgs as DecoratorArgs,
  TRX_CLASS_KEY,
  METHOD_KEY_Transactional,
  METHOD_KEY_Transactional as TRX_METHOD_KEY,
}


/**
 * 声明式事务装饰器
 * Declarative Transactional Decorator
 * @description default config can be set via `KmorePropagationConfig`
 *  in `src/config/config.{default|prod|local}.ts`
 */
export function Transactional(
  /**
   * @default {@link Propagation.REQUIRED}
   */
  propagationType?: TransactionalArgs['propagationType'],
  propagationOptions?: TransactionalArgs['propagationOptions'],
) {

  const opts: Partial<TransactionalArgs> = { }
  if (propagationType) {
    opts.propagationType = propagationType
  }

  if (propagationOptions) {
    opts.propagationOptions = propagationOptions
  }

  return customDecoratorFactory({
    decoratorArgs: opts,
    decoratorKey: METHOD_KEY_Transactional,
    decoratorHandlerClass: DecoratorHandlerTransactional,
  })
}

