import assert from 'node:assert'
import { isPromise } from 'node:util/types'

import { context } from '@opentelemetry/api'
import { genError } from '@waiting/shared-core'
import type { AsyncMethodType } from '@waiting/shared-types'

import { defaultPropDescriptor } from '../config.js'
import type { CreateProxyThenOptions, ProxyThenRunnerOptions } from '../kmore.js'
// import type { KmoreBuilderType } from '../types.js'
import { KmorePageKey, KmoreProxyKey } from '../types.js'

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
    // ) => _proxyThen({ ...options, done, reject }),
    ) => {
      const { kmore } = options
      if (kmore.enableTrace) {
        return context.with(context.active(), () => _proxyThen({ ...options, done, reject }))
      }
      return _proxyThen({ ...options, done, reject })
    },
  })
}


async function _proxyThen(options: ProxyThenRunnerOptions): Promise<unknown> {
  const { kmore, done, reject } = options

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (! options.builder.kmoreQueryId) {
    const errMsg = 'kmoreQueryId should be defined, builder may not be a KmoreQueryBuilder'
    console.error(errMsg)
    const err = new Error(errMsg)
    throw err
  }

  const activeTraceCtx = context.active()
  void activeTraceCtx

  const { builderPostHooks: builderPostHook } = kmore.hookList
  // const pagingOptions = Object.getOwnPropertyDescriptor(options.builder, KmorePageKey.PagingOptions)?.value as PagingOptions
  // assert(pagingOptions, 'pagingOptions missing defined in builder')

  // const builderType = Object.getOwnPropertyDescriptor(options.builder, KmorePageKey.PagingBuilderType)?.value as KmoreBuilderType | undefined

  const opts = { kmore, builder: options.builder }
  try {
    // if (builderType !== KmoreBuilderType.counter && Array.isArray(builderPostHook)) {
    //   for (const hook of builderPostHook) {
    //     assert(typeof hook === 'function', 'builderPostHook should be an array of functions')
    //     await hook(opts)
    //   }
    // }
    if (Array.isArray(builderPostHook)) {
      for (const hook of builderPostHook) {
        assert(typeof hook === 'function', 'builderPostHook should be an array of functions')
        await hook(opts)
      }
    }

    // must after all pre-processors executed!
    const kmoreTrxId = kmore.getTrxByQueryId(opts.builder.kmoreQueryId)?.kmoreTrxId
    const { rowLockLevel, transactionalProcessed, trxPropagated, trxPropagateOptions } = opts.builder

    const total = Object.getOwnPropertyDescriptor(opts.builder, KmorePageKey.PagingMetaTotal)?.value as bigint | undefined
    const opts2 = {
      ...opts,
      input: Promise.resolve([]),
      kmoreTrxId,
      rowLockLevel,
      transactionalProcessed,
      trxPropagated,
      trxPropagateOptions,
    }
    let response: unknown
    if (total === 0n) {
      response = await processThenRet(opts2)
    }
    else {
      // query response or response data
      // @ts-ignore _ori_then
      opts2.input = Reflect.apply(opts.builder[KmoreProxyKey._ori_then] as AsyncMethodType, opts.builder, [])
      response = await processThenRet(opts2)
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

    const kmoreTrxId = kmore.getTrxByQueryId(opts.builder.kmoreQueryId, opts.builder.scope)?.kmoreTrxId
    const { rowLockLevel, transactionalProcessed, trxPropagated, trxPropagateOptions } = opts.builder
    const opts2 = {
      ...opts,
      exception,
      kmoreQueryId: opts.builder.kmoreQueryId,
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
          await processor(opts2)
        }
        catch (ex2) {
          if (opts2.exception !== ex2 && ex2 instanceof Error) {
            opts2.exception = ex2
          }
        }
      }
    }

    if (opts2.exception !== ex && ! opts2.exception.cause) {
      opts2.exception.cause = ex
    }

    if (reject) {
      reject(opts2.exception)
      return
    }
    throw opts2.exception
  }
}

