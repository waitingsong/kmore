/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import type { AsyncMethodType } from '@waiting/shared-types'

import type { KmoreBase, ProxyGetHandlerOptions } from './base.js'
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
    builder,
    propKey,
  } = options
  assert(propKey === 'then', `propKey should be "then", but got: ${propKey.toString()}`)

  const getThenProxy = async (
    done?: (data: unknown) => unknown, // valid when chain next then()
    reject?: (data: unknown) => Error,
  ) => _getThenProxy(kmore, builder, done, reject)

  void Object.defineProperty(getThenProxy, KmoreProxyKey.getThenProxy, {
    ...defaultPropDescriptor,
    value: Date.now(),
  })

  return getThenProxy.bind(builder) as KmoreQueryBuilder['then']
}


async function _getThenProxy(
  kmore: KmoreBase,
  origBuilder: KmoreQueryBuilder,
  done?: (data: unknown) => unknown, // valid when chain next then()
  reject?: (data: unknown) => Error,
): Promise<unknown> {

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

  const kmoreTrxId = kmore.getTrxByKmoreQueryId(kmoreQueryId)?.kmoreTrxId
  const { rowLockLevel, transactionalProcessed, trxPropagated, trxPropagateOptions } = builder

  try {
    if (pagingOptions.enable && builderType !== KmoreBuilderType.counter && Array.isArray(builderPreProcessors)) {
      for (const processor of builderPreProcessors) {
        assert(typeof processor === 'function', 'builderPreProcessors should be an array of functions')
        // eslint-disable-next-line no-await-in-loop
        builder = (await processor({ builder, kmore })).builder
      }
    }

    const total = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingMetaTotal)?.value as bigint | undefined
    const opts = {
      input: Promise.resolve([]),
      builder,
      kmore,
      kmoreQueryId,
      kmoreTrxId,
      rowLockLevel,
      transactionalProcessed,
      trxPropagated,
      trxPropagateOptions,
    }
    let response: unknown
    if (total === 0n) {
      response = await processThenRet(opts)
    }
    else {
      // query response or response data
      // @ts-ignore _ori_then
      opts.input = Reflect.apply(builder['_ori_then'] as AsyncMethodType, builder, [])
      response = await processThenRet(opts)
    }
    return done ? done(response) : response
  }
  catch (ex) {
    assert(ex instanceof Error, 'ex should be an instance of Error')
    const exception = ex

    const opts = {
      exception,
      builder,
      kmore,
      kmoreQueryId,
      kmoreTrxId,
      rowLockLevel,
      transactionalProcessed,
      trxPropagated,
      trxPropagateOptions,
    }

    const { exceptionProcessors } = kmore
    if (exceptionProcessors.length) {
      for (const processor of exceptionProcessors) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await processor(opts)
        }
        catch (ex2) {
          opts.exception = ex2 as Error
        }
      }
    }

    if (opts.exception !== ex && ! opts.exception.cause) {
      opts.exception.cause = ex
    }

    if (reject) {
      reject(opts.exception)
      return
    }
    throw opts.exception
  }
}

