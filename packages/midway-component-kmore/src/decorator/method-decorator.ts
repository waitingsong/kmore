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
import { methodDecoratorKeyMap as cacheMethodDecoratorKeyMap } from '@mwcp/cache'
import {
  Context as WebContext,
  isMethodDecoratoredWith,
} from '@mwcp/share'

import { KmorePropagationConfig } from '../lib/types'

import {
  TransactionalArgs,
  transactionalDecoratorExecutor,
  TransactionalDecoratorExecutorOptions,
  TRX_CLASS_KEY,
  TRX_METHOD_KEY,
  methodDecoratorKeyMap,
  MethodType,
} from './decorator.helper'


export function methodDecoratorPatcher<T, M extends MethodType | undefined = undefined>(
  target: {},
  propertyName: string,
  descriptor: TypedPropertyDescriptor<T>,
  metadata: TransactionalArgs<M> | undefined = {},
): TypedPropertyDescriptor<T> {

  assert(descriptor, 'descriptor is undefined')

  const data = {
    propertyName,
    key: TRX_METHOD_KEY,
    metadata,
    impl: true,
  }

  const keySet = isMethodDecoratoredWith(
    target,
    propertyName,
    Array.from(cacheMethodDecoratorKeyMap.keys()),
  )
  if (keySet.size) {
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const targetName = typeof target.name === 'string' && target.name
      // @ts-ignore
      ? target.name as string
      : target.constructor.name
    const usingDecoratorName = methodDecoratorKeyMap.get(TRX_METHOD_KEY)
    assert(usingDecoratorName, `usingDecoratorName is undefined, key: ${TRX_METHOD_KEY}`)

    const msgArr: string[] = Array.from(keySet).map((key) => {
      const decoratorName = cacheMethodDecoratorKeyMap.get(key)
      assert(decoratorName, `decoratorName is undefined, key: ${key}`)
      return `[@mwcp/kmore] @${decoratorName}() should not be combined with @${usingDecoratorName}() for ${targetName}:${propertyName} `
    })
    console.warn(msgArr.join('\n'))
  }

  attachClassMetadata(
    INJECT_CUSTOM_METHOD,
    data,
    target,
  )
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
    const ret = await joinPoint.proceed(...joinPoint.args) // must await for correct call stack
    return ret
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const webContext = instance[REQUEST_OBJ_CTX_KEY] as WebContext
  assert(webContext, 'webContext is undefined')

  const { propagationType, propagationOptions, cacheOptions } = metaDataOptions.metadata
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
    cacheOptions: cacheOptions ?? false,
  }
  // not return directly, https://v8.dev/blog/fast-async#improved-developer-experience
  const dat = await transactionalDecoratorExecutor(opts)
  return dat
}

interface MetaDataType {
  /** 装饰器所在的实例 */
  target: new (...args: unknown[]) => unknown
  propertyName: string
  metadata: Partial<TransactionalArgs>
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

