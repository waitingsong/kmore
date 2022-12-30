import assert from 'assert'

import { INJECT_CUSTOM_METHOD, getClassMetadata } from '@midwayjs/core'
import {
  CacheableArgs,
  CacheEvictArgs,
  CacheableDecoratorExecutorOptions,
  CacheEvictDecoratorExecutorOptions,
  CachePutDecoratorExecutorOptions,
  cacheableDecoratorExecutor,
  cacheEvictDecoratorExecutor,
  cachePutDecoratorExecutor,
} from '@mwcp/cache'
import { Context as WebContext, DecoratorMetaData, methodHasDecorated } from '@mwcp/share'
import { sleep } from '@waiting/shared-core'
import { PropagationType } from 'kmore'

import { CallerKey, RegisterTrxPropagateOptions } from '../lib/propagation/trx-status.base'
import { genCallerKey } from '../lib/propagation/trx-status.helper'
import { TrxStatusService } from '../lib/trx-status.service'
import { Msg, TransactionalOptions } from '../lib/types'


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
// export type CacheOptions<M extends MethodType | undefined = undefined>
//   = { cacheable: Partial<CacheableArgs<M>> | boolean }
//   | { cacheEvict: Partial<CacheEvictArgs<M>> | boolean }
//   | { cachePut: Partial<CacheableArgs<M>> | boolean }


export interface TransactionalArgs<M extends MethodType | undefined = undefined> {
  /**
   * @default {@link PropagationType.REQUIRED}
   */
  propagationType?: PropagationType | undefined
  /**
   * @default {@link TransactionalOptions}
   */
  propagationOptions?: Partial<TransactionalOptions> | undefined
  /**
   * @default undefined (no cache)
   */
  cacheOptions?: (Partial<CacheOptions<M>> & { op: 'Cacheable' | 'CacheEvict' | 'CachePut'}) | false | undefined
}


export interface TransactionalDecoratorExecutorOptions extends RegisterTrxPropagateOptions {
  method: (...args: unknown[]) => unknown
  methodArgs: unknown[]
  // propagationConfig: KmorePropagationConfig
  webContext: WebContext
  cacheOptions: TransactionalArgs['cacheOptions']
}

export async function transactionalDecoratorExecutor(
  options: TransactionalDecoratorExecutorOptions,
): Promise<unknown> {

  const opts: RegisterTrxPropagateOptions = {
    type: options.type,
    className: options.className,
    funcName: options.funcName,
    readRowLockLevel: options.readRowLockLevel,
    writeRowLockLevel: options.writeRowLockLevel,
  }
  assert(opts.type, 'opts.type propagationType is undefined')
  assert(opts.readRowLockLevel, 'opts.readRowLockLevel is undefined')
  assert(opts.writeRowLockLevel, 'opts.writeRowLockLevel is undefined')

  const trxStatusSvc = await options.webContext.requestContext.getAsync(TrxStatusService)
  assert(trxStatusSvc, 'trxStatusSvc is undefined')

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
    const key = genCallerKey(options.className, options.funcName)
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

  // return Promise.resolve({ callerKey, methodArgs, method, svc: trxStatusSvc })
  //   .then(async (data) => {
  //     const key = data.callerKey
  //     const resp = await data.method(...data.methodArgs)
  //     return { key, resp, svc: data.svc }
  //   })
  //   .then(async (data) => {
  //     const { resp, key, svc } = data
  //     const tkey = svc.retrieveUniqueTopCallerKey(key)
  //     if (! tkey || tkey !== key) {
  //       return resp
  //     }
  //     // only top caller can commit
  //     return svc.trxCommitIfEntryTop(tkey).then(() => resp)
  //   })
  //   .catch((error: unknown) => processEx({
  //     callerKey,
  //     error,
  //     trxStatusSvc,
  //   }))
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

  // return trxStatusSvc.trxRollbackEntry(callerKey)
  //   .then(() => Promise.reject(error))
  //   .catch((ex2: unknown) => {
  //     console.error('trxRollbackEntry/trxCommitEntry error', ex2, error)
  //     const ex2Msg = ex2 instanceof Error
  //       ? ex2.message
  //       : typeof ex2 === 'string' ? ex2 : JSON.stringify(ex2)

  //     const ex3 = new Error(`trxRollbackEntry error >
  //           message: ${ex2Msg}`, { cause: error })
  //     return Promise.reject(ex3)
  //   })
}


export interface TrxDecoratorMetaData {
  propertyName: string
  key: string
  metadata: TransactionalArgs | undefined
  impl: boolean
}

export function retrieveMethodDecoratorArgs(
  target: unknown,
  methodName: string,
): TransactionalArgs | undefined {

  const metaDataArr = getClassMetadata(INJECT_CUSTOM_METHOD, target) as TrxDecoratorMetaData[] | undefined
  if (! metaDataArr?.length) { return }

  for (const row of metaDataArr) {
    if (row.propertyName === methodName) {
      return row.metadata
    }
  }
}


export function checkTrxDecoratorShouldAfterDecoratorKeys(
  decoratorKeyMap: Map<string, string>, //
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: {},
  propertyKey: string,
  metadata: DecoratorMetaData | undefined,
): void {

  const metadataArr: DecoratorMetaData[] | undefined = getClassMetadata(INJECT_CUSTOM_METHOD, target)
  decoratorKeyMap.forEach((key) => {
    if (methodHasDecorated(key, propertyKey, metadataArr)) {
      const msg = `[Kmore] @Transactional() should be used after @Cacheable() on the same method (${propertyKey}
metadata: ${JSON.stringify(metadata, null, 2)}`
      console.warn(msg)
    }
  })
}

async function runWithCacheProcess(options: TransactionalDecoratorExecutorOptions): Promise<unknown> {
  const { cacheOptions, method, methodArgs, webContext } = options

  let resp: unknown = void 0
  if (! cacheOptions) {
    resp = await method(...methodArgs)
    return resp
  }

  const initOpts = {
    cacheName: `${options.className}.${options.funcName}`,
    ttl: void 0,
    key: void 0,
    condition: void 0,
  }

  switch (cacheOptions.op) {
    case 'Cacheable': {
      const opts: CacheableDecoratorExecutorOptions = {
        ...initOpts,
        ...cacheOptions,
        method,
        methodArgs,
        methodResult: void 0,
        webContext,
      }
      resp = await cacheableDecoratorExecutor(opts)
      break
    }

    case 'CacheEvict': {
      const opts: CacheEvictDecoratorExecutorOptions = {
        beforeInvocation: false,
        ...initOpts,
        ...cacheOptions,
        method,
        methodArgs,
        methodResult: void 0,
        webContext,
      }
      resp = await cacheEvictDecoratorExecutor(opts)
      break
    }

    case 'CachePut': {
      const opts: CachePutDecoratorExecutorOptions = {
        ...initOpts,
        ...cacheOptions,
        method,
        methodArgs,
        methodResult: void 0,
        webContext,
      }
      resp = await cachePutDecoratorExecutor(opts)
      break
    }
  }

  return resp
}
