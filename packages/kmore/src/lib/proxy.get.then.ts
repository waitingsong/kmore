/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'assert'

import type { PagerOptions, ProxyGetHandlerOptions } from './base.js'
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
    ctxBuilderPreProcessor,
    ctxBuilderResultPreProcessor,
    ctxExceptionHandler,
  } = options
  assert(propKey === 'then', `propKey should be "then", but got: ${propKey.toString()}`)

  const getThenProxy = async (
    done?: (data: unknown) => unknown,
    reject?: (data: unknown) => Error,
  ) => {

    const builder = typeof ctxBuilderPreProcessor === 'function'
      ? (await ctxBuilderPreProcessor(origBuilder)).builder
      : origBuilder

    const { kmoreQueryId } = builder
    if (! kmoreQueryId) {
      const errMsg = 'kmoreQueryId should be defined, builder may not be a KmoreQueryBuilder'
      console.error(errMsg)
      const err = new Error(errMsg)
      if (reject) {
        return reject(err)
      }
      throw err
    }

    let getThenProxyRet: Promise<unknown>

    if (resultPagerHandler && Object.hasOwn(builder, KmorePageKey.PagingOptions)
      // @ts-ignore
      && builder[KmorePageKey.PagingOptions]?.enable === true
      && ! Object.hasOwn(builder, KmorePageKey.PagingProcessed)
    ) {
      // pager()
      const opts: PagerOptions = {
        builder,
        kmore,
        ctxBuilderPreProcessor: options.ctxBuilderPreProcessor,
        ctxBuilderResultPreProcessor: options.ctxBuilderResultPreProcessor,
        ctxExceptionHandler: options.ctxExceptionHandler,
      }

      getThenProxyRet = resultPagerHandler(opts, createQueryBuilderGetProxy)
    }
    else {
      // query response or response data
      getThenProxyRet = Reflect.apply(builder.then, builder, []) as Promise<unknown>
    }

    const kmoreTrxId = kmore.getTrxByKmoreQueryId(kmoreQueryId)?.kmoreTrxId
    const { rowLockLevel, transactionalProcessed, trxPropagated, trxPropagateOptions } = builder

    return processThenRet({
      ctxBuilderResultPreProcessor,
      ctxExceptionHandler,
      input: getThenProxyRet,
      kmore,
      kmoreQueryId,
      kmoreTrxId,
      rowLockLevel,
      transactionalProcessed,
      trxPropagated,
      trxPropagateOptions,
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

