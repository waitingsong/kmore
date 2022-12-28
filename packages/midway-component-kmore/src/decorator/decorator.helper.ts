import assert from 'assert'

import { INJECT_CUSTOM_METHOD, getClassMetadata } from '@midwayjs/core'
import { Context as WebContext, DecoratorMetaData, methodHasDecorated } from '@mwcp/share'
import { PropagationType } from 'kmore'

import { CallerKey, RegisterTrxPropagateOptions } from '../lib/propagation/trx-status.base'
import { TrxStatusService } from '../lib/trx-status.service'
import { TransactionalOptions } from '../lib/types'


export const TRX_CLASS_KEY = 'decorator:kmore_trxnal_class_decorator_key'
export const TRX_METHOD_KEY = 'decorator:kmore_trxnal_decorator_key'
export const decoratorArgsCacheKey = '__decoratorArgsCacheMap'
export const classDecoratorKeyMap = new Map([ [TRX_CLASS_KEY, 'Transactional'] ])
export const methodDecoratorKeyMap = new Map([ [TRX_METHOD_KEY, 'Tansactional'] ])

export interface DecoratorArgs {
  /**
   * @default {@link PropagationType.REQUIRED}
   */
  propagationType?: PropagationType | undefined
  /**
   * @default {@link TransactionalOptions}
   */
  propagationOptions?: Partial<TransactionalOptions> | undefined
}


export interface TransactionalDecoratorExecutorOptions extends RegisterTrxPropagateOptions {
  method: (...args: unknown[]) => unknown
  methodArgs: unknown[]
  // propagationConfig: KmorePropagationConfig
  webContext: WebContext
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

  let callerKey: CallerKey
  try {
    callerKey = trxStatusSvc.registerPropagation(opts)
  }
  catch (ex) {
    console.error('[Kmore]: registerPropagation error', ex)
    return Promise.reject(ex)
  }

  const { method, methodArgs } = options
  try {
    const resp = await method(...methodArgs)
    const tkey = trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
    if (! tkey || tkey !== callerKey) {
      return resp
    }
    // only top caller can commit
    await trxStatusSvc.trxCommitIfEntryTop(tkey)
    return resp
  }
  catch (error) {
    return processEx({
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

function processEx(options: ProcessExOptions): Promise<never> {
  const { callerKey, trxStatusSvc, error } = options

  const tkey = trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
  if (! tkey || tkey !== callerKey) {
    return Promise.reject(error)
  }

  return trxStatusSvc.trxRollbackEntry(callerKey)
    .then(() => Promise.reject(error))
    .catch((ex2: unknown) => {
      console.error('trxRollbackEntry/trxCommitEntry error', ex2, error)
      const ex2Msg = ex2 instanceof Error
        ? ex2.message
        : typeof ex2 === 'string' ? ex2 : JSON.stringify(ex2)

      const ex3 = new Error(`trxRollbackEntry error >
            message: ${ex2Msg}`, { cause: error })
      return Promise.reject(ex3)
    })
}


export interface TrxDecoratorMetaData {
  propertyName: string
  key: string
  metadata: DecoratorArgs | undefined
  impl: boolean
}

export function retrieveMethodDecoratorArgs(
  target: unknown,
  methodName: string,
): DecoratorArgs | undefined {

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
