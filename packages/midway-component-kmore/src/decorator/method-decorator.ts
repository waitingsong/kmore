/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'assert'

import {
  INJECT_CUSTOM_METHOD,
  JoinPoint,
  MidwayDecoratorService,
  REQUEST_OBJ_CTX_KEY,
  attachClassMetadata,
  getClassMetadata,
} from '@midwayjs/core'
import type { Context as WebContext } from '@mwcp/share'

import { KmorePropagationConfig } from '../lib/types'

import {
  DecoratorArgs,
  transactionalDecoratorExecutor,
  TransactionalDecoratorExecutorOptions,
  TRX_CLASS_KEY,
  TRX_METHOD_KEY,
} from './decorator.helper'


export function methodDecoratorPatcher<T>(
  target: {},
  propertyName: string,
  descriptor: TypedPropertyDescriptor<T>,
  metadata: DecoratorArgs,
): TypedPropertyDescriptor<T> {

  assert(descriptor, 'descriptor is undefined')
  attachClassMetadata(
    INJECT_CUSTOM_METHOD,
    {
      propertyName,
      key: TRX_METHOD_KEY,
      metadata,
      impl: true,
    },
    target,
  )
  // const foo = getClassMetadata(INJECT_CUSTOM_METHOD, target)
  // void foo
  return descriptor
}


export function registerMethodHandler(
  decoratorService: MidwayDecoratorService,
  propagationConfig: KmorePropagationConfig,
): void {

  decoratorService.registerMethodHandler(
    TRX_METHOD_KEY,
    (options: MetaDataType) => ({
      around: (joinPoint: JoinPoint) => aroundFactory(
        joinPoint,
        options,
        propagationConfig,
      ),
    }),
  )
}


async function aroundFactory(
  joinPoint: JoinPoint,
  metaDataOptions: MetaDataType,
  propagationConfig: KmorePropagationConfig,
): Promise<unknown> {

  // eslint-disable-next-line @typescript-eslint/unbound-method
  assert(joinPoint.proceed, 'joinPoint.proceed is undefined')
  assert(typeof joinPoint.proceed === 'function', 'joinPoint.proceed is not funtion')

  // 装饰器所在的实例
  const instance = joinPoint.target
  const classMetaData = getClassMetadata(TRX_CLASS_KEY, instance)
  if (classMetaData) {
    const ret = await joinPoint.proceed(...joinPoint.args) // must await for call stack
    return ret
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const webContext = instance[REQUEST_OBJ_CTX_KEY] as WebContext
  assert(webContext, 'webContext is undefined')

  const { propagationType, propagationOptions } = metaDataOptions.metadata
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const className = instance.constructor?.name ?? metaDataOptions.target.name
  const funcName = joinPoint.methodName as string

  const opts: TransactionalDecoratorExecutorOptions = {
    type: propagationType ?? propagationConfig.propagationType,
    className,
    funcName,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    method: joinPoint.proceed,
    methodArgs: joinPoint.args,
    readRowLockLevel: propagationOptions?.readRowLockLevel ?? propagationConfig.readRowLockLevel,
    writeRowLockLevel: propagationOptions?.writeRowLockLevel ?? propagationConfig.writeRowLockLevel,
    webContext,
  }
  // not return directly, https://v8.dev/blog/fast-async#improved-developer-experience
  const dat = await transactionalDecoratorExecutor(opts)
  return dat
}

interface MetaDataType {
  /** 装饰器所在的实例 */
  target: new (...args: unknown[]) => unknown
  propertyName: string
  metadata: Partial<DecoratorArgs>
}

// interface CreateActiveSpanCbOptions {
//   func: (...args: unknown[]) => unknown
//   args: unknown[]
// }

// async function runCallback(options: CreateActiveSpanCbOptions): Promise<unknown> {
//   const { func, args } = options

//   // 执行原方法. 无论原方法是否 Promise，使用 await 强制等待一次
//   const ret = await func(...args)
//   return ret
// }

