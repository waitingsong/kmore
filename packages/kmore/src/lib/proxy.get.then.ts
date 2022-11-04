/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'assert'

import type { ProxyGetHandlerOptions } from './base.js'
import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { processThenRet } from './proxy.get.helper.js'
import { createQueryBuilderGetProxy } from './proxy.get.js'
import {
  KmorePageKey,
  KmoreProxyKey,
} from './types.js'


/**
 * Create a proxy for `then` method on QueryBuilder, not on QueryResponse
 */
export function proxyGetThen(options: ProxyGetHandlerOptions): KmoreQueryBuilder['then'] {
  const { kmore, target, propKey, resultPagerHandler } = options
  assert(propKey === 'then', `propKey should be "then", but got: ${propKey.toString()}`)

  const getThenProxy = async (
    done?: (data: unknown) => unknown,
    reject?: (data: unknown) => Error,
  ) => {

    const { kmoreQueryId } = target

    let getThenProxyRet: Promise<unknown>

    if (resultPagerHandler && Object.hasOwn(target, KmorePageKey.PagingOptions)
      // @ts-ignore
      && target[KmorePageKey.PagingOptions]?.enable === true
      && ! Object.hasOwn(target, KmorePageKey.PagingProcessed)
    ) {
      // pager()
      getThenProxyRet = resultPagerHandler({ builder: target, kmore }, createQueryBuilderGetProxy)
    }
    else {
      // query response or response data
      getThenProxyRet = Reflect.apply(target.then, target, []) as Promise<unknown>
    }

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

