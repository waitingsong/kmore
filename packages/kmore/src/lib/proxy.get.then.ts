/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import type { AsyncMethodType } from '@waiting/shared-types'

import type { ProxyGetHandlerOptions } from './base.js'
import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import type { PagingOptions } from './paging.types.js'
import { processThenRet } from './proxy.get.helper.js'
import { KmoreBuilderType, KmorePageKey, KmoreProxyKey } from './types.js'


/**
 * Create a proxy for `then` method on QueryBuilder, not on QueryResponse
 */
export function proxyGetThen(options: ProxyGetHandlerOptions): KmoreQueryBuilder['then'] {
  const {
    kmore,
    builder: origBuilder,
    propKey,
  } = options
  assert(propKey === 'then', `propKey should be "then", but got: ${propKey.toString()}`)

  const getThenProxy = async (
    done?: (data: unknown) => unknown, // valid when chain next then()
    reject?: (data: unknown) => Error,
  ) => {

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

    const builderType = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingBuilderType)?.value as KmoreBuilderType | undefined
    try {
      if (pagingOptions.enable && builderType !== KmoreBuilderType.counter && Array.isArray(builderPreProcessors)) {
        for (const processor of builderPreProcessors) {
          assert(typeof processor === 'function', 'builderPreProcessors should be an array of functions')
          // eslint-disable-next-line no-await-in-loop
          builder = (await processor({ builder, kmore })).builder
        }
      }
      // query response or response data
      // @ts-ignore _ori_then
      const getThenProxyRet = Reflect.apply(builder['_ori_then'] as AsyncMethodType, builder, [])

      const kmoreTrxId = kmore.getTrxByKmoreQueryId(kmoreQueryId)?.kmoreTrxId
      const { rowLockLevel, transactionalProcessed, trxPropagated, trxPropagateOptions } = builder

      const response = await processThenRet({
        input: getThenProxyRet,
        builder,
        kmore,
        kmoreQueryId,
        kmoreTrxId,
        rowLockLevel,
        transactionalProcessed,
        trxPropagated,
        trxPropagateOptions,
      })
      return done ? done(response) : response
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

