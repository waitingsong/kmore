/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'assert'

import type { KmoreBase } from './base.js'
import { CtxBuilderResultPreProcessor, CtxBuilderResultPreProcessorOptions, CtxExceptionHandler } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { KmoreProxyKey } from './types.js'


interface ProcessThenRetOptions<Resp = unknown> extends Omit<CtxBuilderResultPreProcessorOptions<Resp>, 'response'> {
  kmore: KmoreBase
  kmoreQueryId: symbol
  input: Promise<Resp>
  ctxBuilderResultPreProcessor: CtxBuilderResultPreProcessor<Resp> | undefined
  ctxExceptionHandler: CtxExceptionHandler | undefined
  transactionalProcessed: boolean | undefined
  done: undefined | ((data: Resp) => Resp)
  reject: undefined | ((data: unknown) => Error)
}

export async function processThenRet(options: ProcessThenRetOptions): Promise<unknown> {

  const {
    ctxBuilderResultPreProcessor,
    ctxExceptionHandler,
    input,
    kmore,
    kmoreQueryId,
    kmoreTrxId,
    rowLockLevel,
    transactionalProcessed,
    trxPropagated,
    trxPropagateOptions,
    done,
    reject,
  } = options

  const pm1 = ctxBuilderResultPreProcessor
    ? input.then((response: unknown) => {
      return ctxBuilderResultPreProcessor({
        kmoreQueryId,
        kmoreTrxId,
        response,
        transactionalProcessed,
        trxPropagateOptions,
        trxPropagated,
        rowLockLevel,
      })
    })
    : input

  const pm2 = ctxExceptionHandler
    ? pm1.catch((ex: unknown) => ctxExceptionHandler({
      kmoreQueryId,
      kmoreTrxId,
      transactionalProcessed,
      trxPropagateOptions,
      trxPropagated,
      rowLockLevel,
      exception: ex,
    }))
    : pm1

  return pm2
    .catch((ex: unknown) => processTrxOnEx(kmore, kmoreQueryId, ex))
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    .then((resp: unknown) => processThen(resp, done))
    .catch((ex: unknown) => processEx({
      ex,
      // kmore,
      // kmoreQueryId: target.kmoreQueryId,
      reject,
    }))
    .then((resp: unknown) => {
      if (resp && typeof resp === 'object'
        && ! Object.hasOwn(resp, KmoreProxyKey.getThenProxyProcessed)
      ) {
        Object.defineProperty(resp, KmoreProxyKey.getThenProxyProcessed, {
          ...defaultPropDescriptor,
          enumerable: false,
          writable: true,
          value: true,
        })
      }

      return resp
    })
}


function processThen(
  resp: unknown,
  cb: ((data: unknown) => any) | undefined,
): Promise<unknown> | any {

  if (resp && typeof resp === 'object'
    && ! Object.hasOwn(resp, KmoreProxyKey.getThenProxyProcessed)
  ) {
    Object.defineProperty(resp, KmoreProxyKey.getThenProxyProcessed, {
      ...defaultPropDescriptor,
      enumerable: false,
      writable: true,
      value: true,
    })
  }

  return typeof cb === 'function' ? cb(resp) : resp
}


interface ProcessExOptions {
  // kmore: KmoreBase
  // kmoreQueryId: symbol
  reject: ((error: unknown) => Error) | undefined
  ex: unknown
}
async function processEx(options: ProcessExOptions): Promise<Error> {
  const { ex, reject } = options

  // await processTrxOnEx(kmore, kmoreQueryId)

  const ex2 = ex instanceof Error
    ? ex
    : typeof ex === 'string'
      ? new Error(ex)
      : new Error('Kmore Error when executing then()', { cause: ex })

  if (typeof reject === 'function') {
    return reject(ex2)
  }
  return Promise.reject(ex2)
}

async function processTrxOnEx(
  kmore: KmoreBase,
  kmoreQueryId: symbol,
  ex?: unknown,
): Promise<void> {

  assert(kmoreQueryId, 'kmoreQueryId should be set on QueryBuilder')
  console.error('processTrxOnEx', kmoreQueryId, ex)

  const trx = kmore.getTrxByKmoreQueryId(kmoreQueryId)
  if (trx) { // also processed on event `query-error`
    await kmore.finishTransaction(trx).catch(console.error)
  }
  if (ex instanceof Error) {
    return Promise.reject(ex)
  }
  else {
    return Promise.reject(new Error('Kmore Error when executing then()', { cause: ex }))
  }
}
