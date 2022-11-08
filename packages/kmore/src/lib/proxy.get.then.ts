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
  const {
    kmore,
    builder: origBuilder,
    propKey,
    resultPagerHandler,
  } = options
  assert(propKey === 'then', `propKey should be "then", but got: ${propKey.toString()}`)

  const getThenProxy = async (
    done?: (data: unknown) => unknown,
    reject?: (data: unknown) => Error,
  ) => {

    const builder = origBuilder

    const { kmoreQueryId } = builder

    let getThenProxyRet: Promise<unknown>

    if (resultPagerHandler && Object.hasOwn(builder, KmorePageKey.PagingOptions)
      // @ts-ignore
      && builder[KmorePageKey.PagingOptions]?.enable === true
      && ! Object.hasOwn(builder, KmorePageKey.PagingProcessed)
    ) {
      // pager()
      getThenProxyRet = resultPagerHandler({ builder, kmore }, createQueryBuilderGetProxy)
    }
    else {
      // query response or response data
      getThenProxyRet = Reflect.apply(builder.then, builder, []) as Promise<unknown>
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

  return getThenProxy.bind(origBuilder) as KmoreQueryBuilder['then']
}

