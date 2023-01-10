import { customDecoratorFactory } from '@mwcp/share'

import {
  MethodType,
  TransactionalArgs,
  TRX_CLASS_KEY,
  METHOD_KEY_Transactional,
} from './decorator.helper'


export {
  classDecoratorKeyMap,
  methodDecoratorKeyMap,
} from './decorator.helper'

export {
  TransactionalArgs as DecoratorArgs,
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
export function Transactional<M extends MethodType | undefined = undefined>(
  /**
   * @default {@link Propagation.REQUIRED}
   */
  propagationType?: TransactionalArgs['propagationType'],
  propagationOptions?: TransactionalArgs['propagationOptions'],
  cacheOptions: TransactionalArgs<M>['cacheOptions'] = false,
): MethodDecorator & ClassDecorator {

  const options: TransactionalArgs<M> = {
    propagationType,
    propagationOptions,
    cacheOptions,
  }
  return customDecoratorFactory<TransactionalArgs<M>>({
    decoratorKey: METHOD_KEY_Transactional,
    decoratorArgs: options,
    enableClassDecorator: true,
  })

}
