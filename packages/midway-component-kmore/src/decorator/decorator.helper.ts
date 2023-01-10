import assert from 'assert'

import {
  REQUEST_OBJ_CTX_KEY,
  getClassMetadata,
} from '@midwayjs/core'
import {
  CacheableArgs,
  CacheEvictArgs,
  METHOD_KEY_Cacheable,
  METHOD_KEY_CacheEvict,
  METHOD_KEY_CachePut,
  cacheableDecoratorExecutor,
  cacheEvictDecoratorExecutor,
  cachePutDecoratorExecutor,
  genDecoratorExecutorOptionsCommon as cacheGenDecoratorExecutorOptionsCommon,
} from '@mwcp/cache'
import {
  AroundFactoryOptions,
  Context as WebContext,
  DecoratorExecutorOptionsBase,
} from '@mwcp/share'
import { sleep } from '@waiting/shared-core'
import { PropagationType, RowLockLevel } from 'kmore'

import { initPropagationConfig, initTransactionalOptons } from '../lib/config'
import { CallerKey, RegisterTrxPropagateOptions } from '../lib/propagation/trx-status.base'
import { genCallerKey } from '../lib/propagation/trx-status.helper'
import { TrxStatusService } from '../lib/trx-status.service'
import { ConfigKey, KmorePropagationConfig, Msg, TransactionalOptions } from '../lib/types'


export const TRX_CLASS_KEY = 'decorator:kmore_trxnal_class_decorator_key'
export const TRX_METHOD_KEY = 'decorator:kmore_trxnal_decorator_key'
export const classDecoratorKeyMap = new Map([ [TRX_CLASS_KEY, 'Transactional'] ])
export const methodDecoratorKeyMap = new Map([ [TRX_METHOD_KEY, 'Tansactional'] ])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MethodType = (...input: any[]) => (any | Promise<any>)
export interface CacheOptions<M extends MethodType | undefined = undefined>
  extends CacheableArgs<M>, CacheEvictArgs<M> {
  // op: 'Cacheable' | 'CacheEvict' | 'CachePut'
}


export interface TransactionalArgs<M extends MethodType | undefined = undefined> {
  /**
   * @default {@link PropagationType.REQUIRED}
   */
  propagationType: PropagationType | undefined
  /**
   * @default {@link TransactionalOptions}
   */
  propagationOptions: Partial<TransactionalOptions> | undefined
  /**
   * @default undefined (no cache)
   */
  cacheOptions: (Partial<CacheOptions<M>> & { op: 'Cacheable' | 'CacheEvict' | 'CachePut'}) | false | undefined
}

export type Method = (...args: unknown[]) => Promise<unknown>
export interface TransactionalDecoratorExecutorOptions extends RegisterTrxPropagateOptions {
  /** 装饰器所在类实例 */
  instance: new (...args: unknown[]) => unknown
  method: Method
  methodArgs: unknown[]
  // propagationConfig: KmorePropagationConfig
  webContext: WebContext
  cacheOptions: TransactionalArgs['cacheOptions']
}

export interface TrxDecoratorMetaData {
  propertyName: string
  key: string
  metadata: TransactionalArgs | undefined
  impl: boolean
}

export interface TrxDecoratorExecutorOptions<T extends TransactionalArgs = TransactionalArgs>
  extends DecoratorExecutorOptionsBase<T> {

  config: KmorePropagationConfig | undefined
}


export function genDecoratorExecutorOptions<TDecoratorArgs extends TransactionalArgs = TransactionalArgs>(
  options: AroundFactoryOptions<TDecoratorArgs>,
): TrxDecoratorExecutorOptions<TDecoratorArgs> {

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { decoratorKey, joinPoint, aopCallbackInputOptions, config } = options
  assert(config, 'config is undefined')

  // eslint-disable-next-line @typescript-eslint/unbound-method
  assert(joinPoint.proceed, 'joinPoint.proceed is undefined')
  assert(typeof joinPoint.proceed === 'function', 'joinPoint.proceed is not funtion')

  // 装饰器所在的实例
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const instance = joinPoint.target
  const funcName = joinPoint.methodName as string
  assert(funcName, 'funcName is undefined')

  const ret = genDecoratorExecutorOptionsCommon({
    decoratorKey,
    config: config as KmorePropagationConfig,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    instance,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    method: joinPoint.proceed,
    methodName: funcName,
    methodArgs: joinPoint.args,
    argsFromClassDecorator: void 0,
    argsFromMethodDecorator: aopCallbackInputOptions.metadata,
  })

  return ret
}


export function genDecoratorExecutorOptionsCommon<T extends TransactionalArgs = TransactionalArgs>(
  options: TrxDecoratorExecutorOptions<T>,
): TrxDecoratorExecutorOptions<T> {

  const {
    decoratorKey,
    argsFromMethodDecorator,
    config: configArgs,
    instance,
    method,
    methodName,
    methodArgs,
  } = options
  assert(instance, 'options.instance is undefined')
  assert(typeof method === 'function', 'options.method is not funtion')

  const webContext = instance[REQUEST_OBJ_CTX_KEY]
  assert(webContext, 'webContext is undefined')

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const app = webContext.app ?? instance.app

  const config = (configArgs
    ?? app.getConfig(ConfigKey.propagationConfig)
    ?? initPropagationConfig) as KmorePropagationConfig
  assert(config, 'config is undefined')

  const className = instance.constructor.name
  assert(className, 'instance.constructor.name is undefined')
  assert(methodName, 'methodName is undefined')

  const args = {
    decoratorType: argsFromMethodDecorator?.decoratedType ?? 'method',
    propagationType: argsFromMethodDecorator?.propagationType ?? PropagationType.REQUIRED,
    propagationOptions: {
      ...initTransactionalOptons,
      ...argsFromMethodDecorator?.propagationOptions,
    },
    cacheOptions: argsFromMethodDecorator?.cacheOptions,
  }

  const argsFromClassDecorator = getClassMetadata<T>(decoratorKey, instance)

  const ret: TrxDecoratorExecutorOptions<T> = {
    decoratorKey,
    argsFromClassDecorator,
    // @ts-ignore
    argsFromMethodDecorator: args,
    config,
    instance,
    method,
    methodArgs,
    methodName,
  }
  return ret
}


export async function transactionalDecoratorExecutor(
  options: TrxDecoratorExecutorOptions<TransactionalArgs>,
): Promise<unknown> {

  const webContext = options.instance[REQUEST_OBJ_CTX_KEY]
  assert(webContext, 'webContext is undefined')

  const trxStatusSvc = await webContext.requestContext.getAsync(TrxStatusService)
  assert(trxStatusSvc, 'trxStatusSvc is undefined')

  const {
    argsFromClassDecorator,
    argsFromMethodDecorator,
    instance,
  } = options

  const type = argsFromMethodDecorator?.propagationType
    ?? argsFromClassDecorator?.propagationType
    ?? PropagationType.REQUIRED

  const readRowLockLevel = argsFromMethodDecorator?.propagationOptions?.readRowLockLevel
    ?? argsFromClassDecorator?.propagationOptions?.readRowLockLevel
    ?? RowLockLevel.ForShare
  const writeRowLockLevel = argsFromMethodDecorator?.propagationOptions?.writeRowLockLevel
    ?? argsFromClassDecorator?.propagationOptions?.writeRowLockLevel
    ?? RowLockLevel.ForUpdate

  const className = instance.constructor.name
  assert(className, 'instance.constructor.name is undefined')

  const opts: RegisterTrxPropagateOptions = {
    type,
    className,
    funcName: options.methodName,
    readRowLockLevel,
    writeRowLockLevel,
  }
  assert(opts.type, 'opts.type propagationType is undefined')
  assert(opts.readRowLockLevel, 'opts.readRowLockLevel is undefined')
  assert(opts.writeRowLockLevel, 'opts.writeRowLockLevel is undefined')

  let callerKey: CallerKey | undefined = void 0
  try {
    callerKey = trxStatusSvc.registerPropagation(opts)
  }
  catch (ex) {
    const prefix = '[Kmore]: registerPropagation error'
    const msg = ex instanceof Error && ex.message.includes(Msg.insufficientCallstacks)
      ? `${prefix}. ${Msg.insufficientCallstacks}`
      : prefix
    console.error(msg, ex)
    const error = new Error(msg, { cause: ex })
    const key = genCallerKey(opts.className, opts.funcName)
    await processEx({
      callerKey: key,
      error,
      trxStatusSvc,
    })
  }
  assert(callerKey)

  try {
    const resp = await runWithCacheProcess(options)

    const tkey = trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
    if (! tkey || tkey !== callerKey) {
      return resp
    }
    // ! delay for commit, prevent from method returning Promise or calling Knex builder without `await`
    await sleep(0)
    // only top caller can commit
    await trxStatusSvc.trxCommitIfEntryTop(tkey)
    return resp
  }
  catch (error) {
    await processEx({
      callerKey,
      error,
      trxStatusSvc,
    })
  }


}

interface ProcessExOptions {
  callerKey: CallerKey
  error: unknown
  trxStatusSvc: TrxStatusService
}
async function processEx(options: ProcessExOptions): Promise<never> {
  const { callerKey, trxStatusSvc, error } = options

  const tkey = trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
  if (! tkey || tkey !== callerKey) {
    throw error
  }

  await trxStatusSvc.trxRollbackEntry(callerKey)
  throw error
}

async function runWithCacheProcess(
  options: TrxDecoratorExecutorOptions<TransactionalArgs>,
  // options0: TransactionalDecoratorExecutorOptions,
): Promise<unknown> {

  const {
    // cacheOptions,
    argsFromClassDecorator,
    argsFromMethodDecorator,
    instance,
    method,
    methodArgs,
    methodName,
  } = options

  assert(instance, 'instance undefined')

  const cacheOptions = argsFromClassDecorator?.cacheOptions
    || argsFromMethodDecorator?.cacheOptions
    ? {
      ...argsFromClassDecorator?.cacheOptions,
      ...argsFromMethodDecorator?.cacheOptions,
    }
    : void 0

  let resp: unknown = void 0
  if (! cacheOptions) {
    resp = await method(...methodArgs)
    return resp
  }

  const className = instance.constructor.name
  assert(className, 'instance.constructor.name is undefined')

  if (! cacheOptions.cacheName) {
    cacheOptions.cacheName = `${className}.${methodName}`
  }

  const input = {
    ...options,
    argsFromClassDecorator: void 0,
    argsFromMethodDecorator: cacheOptions,
    config: void 0,
  }

  switch (cacheOptions.op) {
    case 'Cacheable': {
      const opts = cacheGenDecoratorExecutorOptionsCommon<CacheableArgs>({
        ...input,
        decoratorKey: METHOD_KEY_Cacheable,
        // config?: unknown;
        // /** 装饰器所在类实例 */
        // instance: InstanceOfDecorator;
        // method: Method;
        // methodArgs: unknown[];
        // methodName: string;
        // methodResult?: unknown;
      })
      resp = await cacheableDecoratorExecutor(opts)
      break
    }

    case 'CacheEvict': {
      const opts = cacheGenDecoratorExecutorOptionsCommon<CacheEvictArgs>({
        ...input,
        decoratorKey: METHOD_KEY_CacheEvict,
      })
      resp = await cacheEvictDecoratorExecutor(opts)
      break
    }

    case 'CachePut': {
      const opts = cacheGenDecoratorExecutorOptionsCommon<CacheableArgs>({
        ...input,
        decoratorKey: METHOD_KEY_CachePut,
      })
      resp = await cachePutDecoratorExecutor(opts)
      break
    }

    default:
      throw new TypeError('cacheOptions.op is undefined')
  }

  return resp
}
