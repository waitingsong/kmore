/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'node:assert'

import {
  REQUEST_OBJ_CTX_KEY,
  saveClassMetadata,
  saveModule,
  Provide,
} from '@midwayjs/core'
import type { Context as WebContext } from '@mwcp/share'
import { PropagationType, RowLockLevel } from 'kmore'

import { KmorePropagationConfig } from '../lib/types'

import {
  DecoratorArgs,
  retrieveMethodDecoratorArgs,
  transactionalDecoratorExecutor,
  TransactionalDecoratorExecutorOptions,
  TRX_CLASS_KEY,
} from './decorator.helper'


export function classDecoratorPatcher(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Function,
  args: DecoratorArgs,
): void {

  // 将装饰的类，绑定到该装饰器，用于后续能获取到 class
  saveModule(TRX_CLASS_KEY, target)

  // 保存一些元数据信息，任意你希望存的东西
  saveClassMetadata(
    TRX_CLASS_KEY,
    args,
    target,
  )
  // 指定 IoC 容器创建实例的作用域，这里注册为请求作用域，这样能取到 ctx
  // Scope(ScopeEnum.Request)(target)

  const target2 = wrapClassMethodOnPrototype(target, args)

  // 调用一下 Provide 装饰器，这样用户的 class 可以省略写 @Provide() 装饰器了
  Provide()(target2)
}

function wrapClassMethodOnPrototype(
  target: any,
  options: DecoratorArgs,
): any {

  if (! target.prototype) {
    return target
  }

  const prot = target.prototype as unknown
  for (const key of Object.getOwnPropertyNames(prot)) {
    if (key === 'constructor') { continue }

    const descriptor = Object.getOwnPropertyDescriptor(prot, key)
    if (typeof descriptor?.value === 'function') {
      if (descriptor.value.constructor.name !== 'AsyncFunction') { continue }

      const targetMethodName = `__decorator_orig_${key}`
      if (typeof target.prototype[targetMethodName] === 'function') { continue }

      Object.defineProperty(target.prototype, targetMethodName, {
        value: descriptor.value,
      })

      const wrappedClassDecoratedMethod = async function(this: unknown, ...args: unknown[]): Promise<unknown> {
        // return target.prototype[targetMethodName].apply(this, args)
        const method = target.prototype[targetMethodName].bind(this) as Method
        const resp = await classDecoratorExecuctor(
          this,
          method,
          key,
          args,
          options,
        )
        return resp
      }
      // Object.defineProperty(fn, 'originalMethodName', {
      //   value: key,
      // })
      Object.defineProperty(wrappedClassDecoratedMethod, 'name', {
        writable: true,
        value: key,
      })
      target.prototype[key] = wrappedClassDecoratedMethod
    }
  }

  return target
}

async function classDecoratorExecuctor(
  instance: any,
  method: Method,
  methodName: string,
  methodArgs: unknown[],
  options: DecoratorArgs,
): Promise<unknown> {

  assert(instance, 'instance is required')
  assert(methodName, 'methodName is required')

  const webContext = instance[REQUEST_OBJ_CTX_KEY] as WebContext
  assert(webContext, 'webContext is undefined on this')

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const kmorePropagationConfig = webContext?.app?.getConfig
    ? webContext.app.getConfig('kmorePropagationConfig') as KmorePropagationConfig | undefined
    : void 0

  const className = instance.constructor?.name
  assert(className, 'this.constructor.name is undefined')

  const methodMetaDataArgs = retrieveMethodDecoratorArgs(instance, methodName)

  const type = methodMetaDataArgs?.propagationType
    ?? options.propagationType
    ?? kmorePropagationConfig?.propagationType
    ?? PropagationType.REQUIRED

  const readRowLockLevel = methodMetaDataArgs?.propagationOptions?.readRowLockLevel
    ?? options.propagationOptions?.readRowLockLevel
    ?? kmorePropagationConfig?.readRowLockLevel
    ?? RowLockLevel.ForShare

  const writeRowLockLevel = methodMetaDataArgs?.propagationOptions?.writeRowLockLevel
    ?? options.propagationOptions?.writeRowLockLevel
    ?? kmorePropagationConfig?.writeRowLockLevel
    ?? RowLockLevel.ForUpdate

  const opts: TransactionalDecoratorExecutorOptions = {
    type,
    className,
    funcName: methodName,
    method,
    methodArgs,
    readRowLockLevel,
    writeRowLockLevel,
    webContext,
  }
  const dat = await transactionalDecoratorExecutor(opts)
  return dat
}

type Method = (...args: unknown[]) => Promise<unknown>
