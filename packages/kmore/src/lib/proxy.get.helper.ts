/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import type { KmoreBase, ResponsePreProcessorOptions } from './base.js'
import type { CtxBuilderResultPreProcessorOptions } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import type { PagingOptions } from './paging.types.js'
import { KmoreProxyKey } from './types.js'


interface ProcessThenRetOptions<Resp = unknown> extends Omit<CtxBuilderResultPreProcessorOptions<Resp>, 'response'> {
  kmore: KmoreBase
  kmoreQueryId: symbol
  input: Promise<Resp>
  pagingOptions: PagingOptions
  transactionalProcessed: boolean | undefined
}

export async function processThenRet(options: ProcessThenRetOptions): Promise<unknown> {

  const {
    input,
    kmore,
    kmoreQueryId,
    kmoreTrxId,
    pagingOptions,
    rowLockLevel,
    transactionalProcessed,
    trxPropagated,
    trxPropagateOptions,
  } = options

  const { responsePreProcessors } = kmore
  assert(Array.isArray(responsePreProcessors), 'responsePreProcessors should be an array in Kmore')

  try {
    let resp = await input
    const opts: ResponsePreProcessorOptions = {
      kmore,
      kmoreQueryId,
      kmoreTrxId,
      pagingOptions,
      response: resp,
      transactionalProcessed,
      trxPropagateOptions,
      trxPropagated,
      rowLockLevel,
    }

    for (const processor of responsePreProcessors) {
      // eslint-disable-next-line no-await-in-loop
      resp = await processor(opts)
    }

    updateRespProperties(resp)
    return resp
  }
  catch (ex) {
    assert(ex instanceof Error, 'Exception should be an instance of Error')
    await processTrxOnEx(kmore, kmoreQueryId, ex)
  }

  // const pm2 = ctxExceptionHandler
  //   ? pm1.catch((ex: unknown) => ctxExceptionHandler({
  //     kmoreQueryId,
  //     kmoreTrxId,
  //     transactionalProcessed,
  //     trxPropagateOptions,
  //     trxPropagated,
  //     rowLockLevel,
  //     exception: ex,
  //   }))
  //   : pm1

  // return pm2
  //   .catch((ex: unknown) => processTrxOnEx(kmore, kmoreQueryId, ex))
  //   // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  //   .then((resp: unknown) => processThen(resp, done))
  //   .catch((ex: unknown) => processEx({
  //     ex,
  //     // kmore,
  //     // kmoreQueryId: target.kmoreQueryId,
  //     reject,
  //   }))
  //   .then((resp: unknown) => {
  //     if (resp && typeof resp === 'object'
  //       && ! Object.hasOwn(resp, KmoreProxyKey.getThenProxyProcessed)
  //     ) {
  //       Object.defineProperty(resp, KmoreProxyKey.getThenProxyProcessed, {
  //         ...defaultPropDescriptor,
  //         enumerable: false,
  //         writable: true,
  //         value: true,
  //       })
  //     }

  //     return resp
  //   })
}


function updateRespProperties(resp: unknown): void {
  if (resp && typeof resp === 'object') {
    Object.defineProperty(resp, KmoreProxyKey.getThenProxyProcessed, {
      ...defaultPropDescriptor,
      enumerable: false,
      writable: true,
      value: true,
    })
  }
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
