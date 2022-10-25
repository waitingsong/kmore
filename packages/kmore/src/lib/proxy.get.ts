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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    done?: PromiseLike<unknown> | ((data: unknown) => any),
    reject?: PromiseLike<unknown> | ((error: Error) => unknown),
  ) => {

    try {
      // query response or response data
      const resp = await Reflect.apply(target.then, target, []) as unknown

      if (typeof resp === 'object' && resp !== null) {
        Object.defineProperty(resp, KmoreProxyKey.getThenProxyProcessed, {
          ...defaultPropDescriptor,
          enumerable: false,
          writable: true,
          value: true,
        })
      }

      if (typeof done === 'function') {
        const resp2 = await done(resp)
        if (typeof resp2 === 'object'
          && resp2 !== null
          && typeof resp2[KmoreProxyKey.getThenProxyProcessed] === 'undefined'
        ) {
          Object.defineProperty(resp2, KmoreProxyKey.getThenProxyProcessed, {
            ...defaultPropDescriptor,
            enumerable: false,
            writable: true,
            value: true,
          })
        }
        return resp2
      }
      return resp
    }
    catch (ex) {
      processEx({
        ex,
        kmore,
        kmoreQueryId: target.kmoreQueryId,
        reject,
      })
    }
  }
  void Object.defineProperty(getThenProxy, KmoreProxyKey.getThenProxy, {
    ...defaultPropDescriptor,
    value: Date.now(),
  })

  return getThenProxy.bind(target) as KmoreQueryBuilder['then']
}


interface ProcessExOptions {
  kmore: KmoreBase
  kmoreQueryId: symbol
  reject: PromiseLike<unknown> | ((error: Error) => unknown) | undefined
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

