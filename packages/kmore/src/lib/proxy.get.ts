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
    reject?: (data: unknown) => unknown,
  ) => {

    // query response or response data
    const getthenProxyRet = Reflect.apply(target.then, target, []) as Promise<unknown>

    return getthenProxyRet
      .then((resp: unknown) => processThen(resp, done))
      .catch((ex: unknown) => processEx({
        ex,
        kmore,
        kmoreQueryId: target.kmoreQueryId,
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
  kmore: KmoreBase
  kmoreQueryId: symbol
  reject: ((error: unknown) => unknown) | undefined
  ex: unknown
}
function processEx(options: ProcessExOptions): never {
  const { ex, kmore, kmoreQueryId, reject } = options

  const qid = kmoreQueryId
  assert(qid, 'kmoreQueryId should be set on QueryBuilder')

  const trx = kmore.getTrxByKmoreQueryId(qid)
  if (trx) { // also processed on event `query-error`
    void kmore.finishTransaction(trx).catch(console.error)
  }

  if (typeof reject === 'function') {
    // @ts-ignore
    return reject(ex)
  }

  if (ex instanceof Error) {
    throw ex
  }
  else if (typeof ex === 'string') {
    throw new Error(ex)
    // return Promise.reject(new Error(ex))
  }
  else {
    throw new Error('Kmore Error when executing then()', {
      cause: ex,
    })
  }
}

