/* eslint-disable @typescript-eslint/ban-types */
import assert from 'node:assert'

// import { createCustomMethodDecorator } from '@midwayjs/core'

import { classDecoratorPatcher } from './class-decorator'
import {
  DecoratorArgs,
  TRX_CLASS_KEY,
  TRX_METHOD_KEY,
  decoratorArgsCacheKey,
} from './decorator.helper'
import { methodDecoratorPatcher } from './method-decorator'


export {
  DecoratorArgs,
  TRX_CLASS_KEY,
  TRX_METHOD_KEY,
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
  propagationType?: DecoratorArgs['propagationType'],
  propagationOptions?: DecoratorArgs['propagationOptions'],
): MethodDecorator & ClassDecorator {
// ): MethodDecorator {


  // return createCustomMethodDecorator(TRX_METHOD_KEY, {
  //   propagationType,
  //   propagationOptions,
  // })

  const transactionalDecoratorFactory = <T>(
    target: T,
    propertyKey?: string,
    descriptor?: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> | void => {

    assert(target, 'target is undefined')

    // @ts-ignore
    let decoratorArgsCacheMap = target[decoratorArgsCacheKey] as Map<PropertyKey, DecoratorArgs> | undefined
    if (! decoratorArgsCacheMap) {
      decoratorArgsCacheMap = new Map()
      // @ts-ignore
      target[decoratorArgsCacheKey] = decoratorArgsCacheMap
    }

    if (typeof target === 'function') { // Class Decorator
      return classDecoratorPatcher(target, { propagationType, propagationOptions })
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

      if (propagationType || propagationOptions) {
        const metadata: DecoratorArgs = { propagationType, propagationOptions }
        decoratorArgsCacheMap.set(propertyKey, metadata)
      }

      return methodDecoratorPatcher<T>(
        target as {},
        propertyKey,
        descriptor,
        { propagationType, propagationOptions },
      )
    }

    assert(false, 'Invalid decorator usage')
  }

  // @ts-expect-error
  return transactionalDecoratorFactory
}
