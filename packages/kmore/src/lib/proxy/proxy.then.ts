/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'
import { isPromise } from 'node:util/types'

import { genError } from '@waiting/shared-core'
import type { AsyncMethodType } from '@waiting/shared-types'

import { defaultPropDescriptor } from '../config.js'
import type { CreateProxyThenOptions, ProxyThenRunnerOptions } from '../kmore.js'
import { KmoreBuilderType, KmorePageKey, KmoreProxyKey } from '../types.js'

import { processThenRet } from './proxy.then.helper.js'


/**
 * Create a proxy for `then` method on QueryBuilder, not on QueryResponse
 */
export function createProxyThen(options: CreateProxyThenOptions): void {
  const { builder } = options

  // @ts-ignore
  assert(typeof builder[KmoreProxyKey._ori_then] === 'undefined', 'builder[KmoreProxyKey._ori_then] should be undefined')

  void Object.defineProperty(builder, KmoreProxyKey._ori_then, {
    ...defaultPropDescriptor,
    value: builder.then,
  })

  void Object.defineProperty(builder, KmoreProxyKey.then, {
    ...defaultPropDescriptor,
    writable: true,
    value: (
      done?: (data: unknown) => unknown, // valid when chain next then()
      reject?: (data: unknown) => Error,
    ) => _proxyThen({ ...options, done, reject }),
  })
}


async function _proxyThen(options: ProxyThenRunnerOptions): Promise<unknown> {
  const { kmore, done, reject } = options
  let { builder } = options

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (! builder.kmoreQueryId) {
    const errMsg = 'kmoreQueryId should be defined, builder may not be a KmoreQueryBuilder'
    console.error(errMsg)
    const err = new Error(errMsg)
    throw err
  }

  const { builderPostHooks: builderPostHook } = kmore.hookList
  // const pagingOptions = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingOptions)?.value as PagingOptions
  // assert(pagingOptions, 'pagingOptions missing defined in builder')

  const builderType = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingBuilderType)?.value as KmoreBuilderType | undefined

  try {
    if (builderType !== KmoreBuilderType.counter && Array.isArray(builderPostHook)) {
      for (const hook of builderPostHook) {
        assert(typeof hook === 'function', 'builderPostHook should be an array of functions')
        // eslint-disable-next-line no-await-in-loop
        builder = (await hook({ kmore, builder })).builder
      }
    }
    // must after all pre-processors executed!
    const kmoreTrxId = kmore.getTrxByQueryId(builder.kmoreQueryId)?.kmoreTrxId
    const { rowLockLevel, transactionalProcessed, trxPropagated, trxPropagateOptions } = builder

    const total = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingMetaTotal)?.value as bigint | undefined
    const opts = {
      input: Promise.resolve([]),
      builder,
      kmore,
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
      opts.input = Reflect.apply(builder[KmoreProxyKey._ori_then] as AsyncMethodType, builder, [])
      response = await processThenRet(opts)
    }
    if (typeof done === 'function') {
      const res = done(response)
      if (isPromise(res)) { // process return promise in .then()
        const res2 = await res // may goto catch block if return Promise.reject() in .then()
        return res2
      }
      return res
    }
    return response
  }
  catch (ex) { // ex is Error or string
    const exception = genError({ error: ex })

    const kmoreTrxId = kmore.getTrxByQueryId(builder.kmoreQueryId, builder.scope)?.kmoreTrxId
    const { rowLockLevel, transactionalProcessed, trxPropagated, trxPropagateOptions } = builder
    const opts = {
      exception,
      builder,
      kmore,
      kmoreQueryId: builder.kmoreQueryId,
      kmoreTrxId,
      rowLockLevel,
      transactionalProcessed,
      trxPropagated,
      trxPropagateOptions,
    }

    const { exceptionHooks: exceptionHook } = kmore.hookList
    if (exceptionHook.length) {
      for (const processor of exceptionHook) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await processor(opts)
        }
        catch (ex2) {
          if (opts.exception !== ex2 && ex2 instanceof Error) {
            opts.exception = ex2
          }
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

