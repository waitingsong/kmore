import assert from 'assert'

import type {
  CacheableArgs,
  CacheEvictArgs,
} from '@mwcp/cache'
import { OtelComponent, TraceService } from '@mwcp/otel'
import {
  Context as WebContext,
  DecoratorExecutorParamBase,
  DecoratorMetaDataPayload,
  DecoratorMetaData,
  deepmerge,
} from '@mwcp/share'
import { sleep } from '@waiting/shared-core'
import { PropagationType } from 'kmore'

import { initTransactionalOptons } from '../lib/config'
import { CallerKey, RegisterTrxContext, RegisterTrxPropagateOptions } from '../lib/propagation/trx-status.abstract'
import { genCallerKey } from '../lib/propagation/trx-status.helper'
import { TrxStatusService } from '../lib/trx-status.service'
import { ConfigKey, KmorePropagationConfig, Msg, TransactionalOptions } from '../lib/types'


export const TRX_CLASS_KEY = 'decorator:kmore_trxnal_class_decorator_key'
export const METHOD_KEY_Transactional = 'decorator:kmore_trxnal_decorator_key'
export const classDecoratorKeyMap = new Map([ [TRX_CLASS_KEY, 'Transactional'] ])
export const methodDecoratorKeyMap = new Map([ [METHOD_KEY_Transactional, 'Tansactional'] ])

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
  webContext: WebContext | undefined
  cacheOptions: TransactionalArgs['cacheOptions']
}

export type TrxDecoratorMetaData = DecoratorMetaData<TransactionalArgs>

export interface TrxDecoratorExecutorOptions extends DecoratorExecutorParamBase<TransactionalArgs> {
  config: KmorePropagationConfig
  // trxStatusService: TrxStatusServiceBase
}


export function genDecoratorExecutorOptions(
  options: DecoratorExecutorParamBase<TransactionalArgs>,
): TrxDecoratorExecutorOptions {

  const {
    decoratorKey,
    instance,
    method,
    methodName,
    methodArgs,
    mergedDecoratorParam,
    webApp,
  } = options

  assert(webApp, 'webApp is undefined')
  assert(typeof method === 'function', 'options.method is not funtion')

  const initArgs = {
    propagationType: PropagationType.REQUIRED,
    propagationOptions: {
      ...initTransactionalOptons,
    },
    cacheOptions: false,
  }

  const args = deepmerge.all([
    initArgs,
    mergedDecoratorParam ?? {},
  ]) as DecoratorMetaDataPayload<TransactionalArgs>

  const config = webApp.getConfig(ConfigKey.propagationConfig) as KmorePropagationConfig
  assert(config, 'propagationConfig is undefined')

  const ret: TrxDecoratorExecutorOptions = {
    span: void 0,
    ...options,
    config,
    decoratorKey,
    mergedDecoratorParam: args,
    instance,
    method,
    methodArgs,
    methodName,
  }
  return ret
}


export async function transactionalDecoratorExecutor(
  options: TrxDecoratorExecutorOptions,
): Promise<unknown> {

  const {
    instanceName,
    mergedDecoratorParam,
    methodName,
    webApp,
    webContext,
  } = options

  let { span } = options

  // const webContext = options.instance[REQUEST_OBJ_CTX_KEY]
  // assert(webContext.requestContext, 'webContext.requestContext is undefined')

  // @ts-ignore
  const trxStatusSvc = (webApp[`_${ConfigKey.trxStatusService}`] as TrxStatusService | undefined)
    ?? await webApp.getApplicationContext().getAsync(TrxStatusService)
  assert(trxStatusSvc, 'trxStatusSvc is undefined')

  const regContext = webContext?.requestContext
    ? webContext
    : webApp
  assert(regContext, 'regContext is undefined')


  if (typeof span === 'undefined') { // skip false
    span = trxStatusSvc.getTrxRootSpan(regContext)
  }
  if (typeof span === 'undefined') { // skip false
    if (webContext?.requestContext) {
      const traceSvc = await webContext.requestContext.getAsync(TraceService)
      if (traceSvc.isStarted) {
        span = traceSvc.rootSpan
      }
    }
    else {
      const otel = await webApp.getApplicationContext().getAsync(OtelComponent)
      span = otel.getGlobalCurrentSpan()
    }
  }

  assert(mergedDecoratorParam, 'mergedDecoratorParam is undefined')
  assert(mergedDecoratorParam.propagationOptions, 'propagationOptions is undefined')

  const type = mergedDecoratorParam.propagationType
  assert(type, 'propagationType is undefined')

  const { readRowLockLevel, writeRowLockLevel } = mergedDecoratorParam.propagationOptions
  assert(readRowLockLevel, 'readRowLockLevel is undefined')
  assert(writeRowLockLevel, 'writeRowLockLevel is undefined')

  const className = instanceName
  assert(className, 'instance.constructor.name is undefined')

  const opts: RegisterTrxPropagateOptions = {
    type,
    className,
    funcName: methodName,
    readRowLockLevel,
    writeRowLockLevel,
    regContext,
    span,
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
      regContext,
      callerKey: key,
      error,
      trxStatusSvc,
    })
  }
  assert(callerKey)

  try {
    const { method, methodArgs } = options
    const resp = await method(...methodArgs)

    const tkey = trxStatusSvc.retrieveUniqueTopCallerKey(regContext, callerKey)
    if (! tkey || tkey !== callerKey) {
      return resp
    }
    // ! delay for commit, prevent from method returning Promise or calling Knex builder without `await`
    await sleep(0)
    // only top caller can commit
    await trxStatusSvc.trxCommitIfEntryTop(regContext, tkey)
    return resp
  }
  catch (error) {
    await processEx({
      regContext,
      callerKey,
      error,
      trxStatusSvc,
    })
  }


}

interface ProcessExOptions {
  regContext: RegisterTrxContext
  callerKey: CallerKey
  error: unknown
  trxStatusSvc: TrxStatusService
}
async function processEx(options: ProcessExOptions): Promise<never> {
  const { callerKey, trxStatusSvc, error, regContext } = options

  const tkey = trxStatusSvc.retrieveUniqueTopCallerKey(regContext, callerKey)
  if (! tkey || tkey !== callerKey) {
    throw error
  }

  await trxStatusSvc.trxRollbackEntry(regContext, callerKey)
  throw error
}

