/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import { genError } from '@waiting/shared-core'

import type { PagerOptions, ProxyGetHandlerOptions } from './base.js'
import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import type { PagingOptions } from './paging.types.js'
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
  } = options
  assert(propKey === 'then', `propKey should be "then", but got: ${propKey.toString()}`)

  const getThenProxy = async (
    done?: (data: unknown) => unknown, // valid when chain next then()
    reject?: (data: unknown) => Error,
  ) => {

    let getThenProxyRet: Promise<unknown>
    let builder = origBuilder

    const { kmoreQueryId } = builder
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (! kmoreQueryId) {
      const errMsg = 'kmoreQueryId should be defined, builder may not be a KmoreQueryBuilder'
      console.error(errMsg)
      const err = new Error(errMsg)
      throw err
    }

    const { builderPreProcessors } = kmore
    const pagingOptions = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingOptions)?.value as PagingOptions
    assert(pagingOptions, 'pagingOptions missing defined in builder')

    if (pagingOptions.enable && Array.isArray(builderPreProcessors) && builderPreProcessors.length > 0) {
      for (const processor of builderPreProcessors) {
        assert(typeof processor === 'function', 'builderPreProcessors should be an array of functions')
        // eslint-disable-next-line no-await-in-loop
        builder = (await processor({ builder, kmore })).builder
      }
      // query response or response data
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      getThenProxyRet = Reflect.apply(builder['_ori_then'], builder, [])
    }
    else {
      builder = typeof ctxBuilderPreProcessor === 'function'
        ? (await ctxBuilderPreProcessor(origBuilder)).builder
        : origBuilder

      if (resultPagerHandler && Object.hasOwn(builder, KmorePageKey.PagingOptions)
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        getThenProxyRet = Reflect.apply(builder['_ori_then'], builder, [])
      }
    }

    const kmoreTrxId = kmore.getTrxByKmoreQueryId(kmoreQueryId)?.kmoreTrxId
    const { rowLockLevel, transactionalProcessed, trxPropagated, trxPropagateOptions } = builder

    try {
      const response = await processThenRet({
        input: getThenProxyRet,
        kmore,
        kmoreQueryId,
        kmoreTrxId,
        pagingOptions,
        rowLockLevel,
        transactionalProcessed,
        trxPropagated,
        trxPropagateOptions,
      })
      done ? done(response) : response
    }
    catch (ex) {
      if (reject) {
        reject(ex)
        return
      }
      throw ex
    }
  }
  void Object.defineProperty(getThenProxy, KmoreProxyKey.getThenProxy, {
    ...defaultPropDescriptor,
    value: Date.now(),
  })

  return getThenProxy.bind(origBuilder) as KmoreQueryBuilder['then']
}

