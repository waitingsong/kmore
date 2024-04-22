import {
  CustomDecoratorFactoryOptions,
  customDecoratorFactory,
} from '@mwcp/share'

import { DecoratorHandlerTransactional } from './transactional.handler.js'
import {
  MethodType,
  TransactionalArgs,
  TRX_CLASS_KEY,
  METHOD_KEY_Transactional,
} from './transactional.helper.old.js'


export {
  classDecoratorKeyMap,
  methodDecoratorKeyMap,
} from './transactional.helper.old.js'

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
) {

  const options: Partial<TransactionalArgs<M>> = { }
  // !!
  if (propagationType) {
    options.propagationType = propagationType
  }
  if (propagationOptions) {
    options.propagationOptions = propagationOptions
  }
  // @FIXME
  void cacheOptions
  // if (cacheOptions) {
  //   options.cacheOptions = cacheOptions
  // }

  const opts: CustomDecoratorFactoryOptions<TransactionalArgs<M>> = {
    decoratorKey: METHOD_KEY_Transactional,
    decoratorArgs: options,
    decoratorHandlerClass: DecoratorHandlerTransactional,
  }
  // if (cacheOptions) {
  //   let decoratorKey = ''
  //   switch (cacheOptions.op) {
  //     case 'Cacheable':
  //       decoratorKey = METHOD_KEY_Cacheable
  //       break

  //     case 'CacheEvict':
  //       decoratorKey = METHOD_KEY_CacheEvict
  //       break

  //     case 'CachePut':
  //       decoratorKey = METHOD_KEY_CachePut
  //       break
  //   }
  //   assert(decoratorKey, `invalid cacheOptions.op: ${cacheOptions.op}`)

  //   opts.before = (target, propertyName, descriptor) => {
  //     const opts2: CustomDecoratorFactoryOptions<CacheableArgs<M>> = {
  //       decoratorKey,
  //       decoratorArgs: cacheOptions,
  //       enableClassDecorator: false,
  //       classIgnoreIfMethodDecoratorKeys: cacheableClassIgnoreIfMethodDecoratorKeys,
  //       methodIgnoreIfMethodDecoratorKeys: cacheableMethodIgnoreIfMethodDecoratorKeys,
  //     }
  //     regCustomDecorator(target, propertyName, descriptor, opts2)
  //   }
  // }

  return customDecoratorFactory(opts)
}

