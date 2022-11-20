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

import { KmorePropagationConfig } from '../lib/types'

import {
  DecoratorArgs,
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
      const targetMethodName = `__decorator_orig_${key}`
      Object.defineProperty(target.prototype, targetMethodName, {
        value: descriptor.value,
      })
      // eslint-disable-next-line no-loop-func
      target.prototype[key] = async function(...args: unknown[]): Promise<unknown> {
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

  const webContext = instance[REQUEST_OBJ_CTX_KEY] as WebContext
  assert(webContext, 'webContext is undefined on this')

  const kmorePropagationConfig = webContext.app.getConfig('kmorePropagationConfig') as KmorePropagationConfig

  const className = instance.constructor?.name
  assert(className, 'this.constructor.name is undefined')

  const opts: TransactionalDecoratorExecutorOptions = {
    type: options.propagationType ?? kmorePropagationConfig.propagationType,
    className,
    funcName: methodName,
    method,
    methodArgs,
    readRowLockLevel: options.propagationOptions?.readRowLockLevel ?? kmorePropagationConfig.readRowLockLevel,
    writeRowLockLevel: options.propagationOptions?.writeRowLockLevel ?? kmorePropagationConfig.writeRowLockLevel,
    webContext,
  }
  const dat = await transactionalDecoratorExecutor(opts)
  return dat
}

type Method = (...args: unknown[]) => Promise<unknown>
