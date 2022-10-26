/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'assert'

import type { KmoreBase, ProxyGetOptions } from './base.js'
import { defaultPropDescriptor } from './config.js'
import {
  KmoreQueryBuilder,
  KmoreProxyKey,
} from './types.js'


export function createQueryBuilderGetProxy(
  kmore: KmoreBase,
  builder: KmoreQueryBuilder,
): KmoreQueryBuilder {
  const ret = new Proxy(builder, {
    get: (target: KmoreQueryBuilder, propKey: string | symbol, receiver: unknown) => {
      switch (propKey) {
        case 'then':
          return proxyGetThen({ kmore, target, propKey, receiver })
        default:
          return Reflect.get(target, propKey, receiver)
      }
    },
  })
  void Object.defineProperty(ret, 'createQueryBuilderGetProxyKey', {
    ...defaultPropDescriptor,
    value: Date.now(),
  })

  return ret
}

/**
 * Create a proxy for `then` method on QueryBuilder, not on QueryResponse
 */
function proxyGetThen(options: ProxyGetOptions): KmoreQueryBuilder['then'] {
  const { kmore, target, propKey } = options
  assert(propKey === 'then', `propKey should be "then", but got: ${propKey.toString()}`)

  const getThenProxy = async (
    done?: (data: unknown) => unknown,
    reject?: (data: unknown) => Error,
  ) => {

    const { kmoreQueryId } = target
    // query response or response data
    const getThenProxyRet = Reflect.apply(target.then, target, []) as Promise<unknown>
    return processThenRet({
      kmore,
      kmoreQueryId,
      input: getThenProxyRet,
      done,
      reject,
    })
  }
  void Object.defineProperty(getThenProxy, KmoreProxyKey.getThenProxy, {
    ...defaultPropDescriptor,
    value: Date.now(),
  })

  return getThenProxy.bind(target) as KmoreQueryBuilder['then']
}

function processThen(
  resp: unknown,
  cb: ((data: unknown) => any) | undefined,
): Promise<unknown> | unknown {

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

  const trx = kmore.getTrxByKmoreQueryId(kmoreQueryId)
  if (trx) { // also processed on event `query-error`
    await kmore.finishTransaction(trx).catch(console.error)
  }
  if (ex) {
    return Promise.reject(ex)
  }
}

interface ProcessThenRetOptions {
  kmore: KmoreBase
  kmoreQueryId: symbol
  input: Promise<unknown>
  done: undefined | ((data: unknown) => unknown)
  reject: undefined | ((data: unknown) => Error)
}
async function processThenRet(options: ProcessThenRetOptions): Promise<unknown> {
  const { kmore, kmoreQueryId, input, done, reject } = options

  return input
    .catch((ex: unknown) => processTrxOnEx(kmore, kmoreQueryId, ex))
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

