/* eslint-disable @typescript-eslint/ban-types */
import assert from 'node:assert'

import { customDecoratorFactory } from '@mwcp/share'

import { classDecoratorPatcher } from './class-decorator'
import {
  MethodType,
  TransactionalArgs,
  TRX_CLASS_KEY,
  TRX_METHOD_KEY,
} from './decorator.helper'
import { methodDecoratorPatcher } from './method-decorator'


export {
  TransactionalArgs as DecoratorArgs,
  TRX_CLASS_KEY,
  TRX_METHOD_KEY,
}


export function Cacheable<M extends MethodType | undefined = undefined>(
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

  return customDecoratorFactory<TransactionalArgs<M>, M>(
    options,
    classDecoratorPatcher,
    methodDecoratorPatcher,
  )
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

  const transactionalDecoratorFactory = <T>(
    target: T,
    propertyKey?: string,
    descriptor?: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> | void => {

    assert(target, 'target is undefined')

    if (typeof target === 'function') { // Class Decorator
      return classDecoratorPatcher(target, { propagationType, propagationOptions, cacheOptions })
    }

    if (typeof target === 'object') { // Method Decorator
      assert(target, 'target is undefined')
      assert(propertyKey, 'propertyKey is undefined')
      assert(descriptor, 'descriptor is undefined')

      if (typeof descriptor.value !== 'function') {
        throw new Error('Only methods can be decorated with @Transactional decorator')
      }

      if (descriptor.value.constructor.name !== 'AsyncFunction') {
        return descriptor
      }

      const metadata = { propagationType, propagationOptions, cacheOptions }
      return methodDecoratorPatcher<T, M>(
        target as {},
        propertyKey,
        descriptor,
        metadata,
      )
    }

    assert(false, 'Invalid decorator usage')
  }

  // @ts-expect-error
  return transactionalDecoratorFactory
}
