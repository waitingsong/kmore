import { assert } from 'console'

import {
  CacheableArgs,
  METHOD_KEY_CacheEvict,
  METHOD_KEY_CachePut,
  METHOD_KEY_Cacheable,
  cacheableClassIgnoreIfMethodDecoratorKeys,
  cacheableMethodIgnoreIfMethodDecoratorKeys,
} from '@mwcp/cache'
import {
  CustomDecoratorFactoryParam,
  customDecoratorFactory,
  regCustomDecorator,
} from '@mwcp/share'

import {
  MethodType,
  TransactionalArgs,
  TRX_CLASS_KEY,
  METHOD_KEY_Transactional,
} from './decorator.helper.js'


export {
  classDecoratorKeyMap,
  methodDecoratorKeyMap,
} from './decorator.helper.js'

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

  const options: Partial<TransactionalArgs<M>> = {
    // propagationType,
    // propagationOptions,
    // cacheOptions,
  }
  // !!
  if (propagationType) {
    options.propagationType = propagationType
  }
  if (propagationOptions) {
    options.propagationOptions = propagationOptions
  }
  if (cacheOptions) {
    options.cacheOptions = cacheOptions
  }

  const opts: CustomDecoratorFactoryParam<TransactionalArgs<M>> = {
    decoratorKey: METHOD_KEY_Transactional,
    decoratorArgs: options,
    enableClassDecorator: true,
  }
  if (cacheOptions) {
    let dkey = ''
    switch (cacheOptions.op) {
      case 'Cacheable':
        dkey = METHOD_KEY_Cacheable
        break
      case 'CacheEvict':
        dkey = METHOD_KEY_CacheEvict
        break
      case 'CachePut':
        dkey = METHOD_KEY_CachePut
        break
    }
    assert(dkey, `invalid cacheOptions.op: ${cacheOptions.op}`)

    opts.before = (target, propertyName, descriptor) => {
      const opts2: CustomDecoratorFactoryParam<CacheableArgs<M>> = {
        decoratorKey: dkey,
        decoratorArgs: cacheOptions,
        enableClassDecorator: false,
        classIgnoreIfMethodDecoratorKeys: cacheableClassIgnoreIfMethodDecoratorKeys,
        methodIgnoreIfMethodDecoratorKeys: cacheableMethodIgnoreIfMethodDecoratorKeys,
      }
      regCustomDecorator(target, propertyName, descriptor, opts2)
    }
  }

  return customDecoratorFactory<TransactionalArgs<M>>(opts)
}

