/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import assert from 'node:assert'

import { Attributes, TraceService } from '@mwcp/otel'
import { genISO8601String } from '@waiting/shared-core'
import {
  CaseType,
  CtxBuilderPreProcessor,
  CtxBuilderResultPreProcessor,
  CtxBuilderResultPreProcessorOptions,
  CtxExceptionHandler,
  CtxExceptionHandlerOptions,
  Kmore,
  KmoreQueryBuilder,
  KmoreTransaction,
  TbQueryBuilder,
  TbQueryBuilderOptions,
} from 'kmore'

import { DbSourceManager } from '../db-source-manager.js'
import { TrxStatusService } from '../trx-status.service.js'
import { KmoreAttrNames } from '../types.js'

import { BuilderKeys, builderKeys, Dbqb } from './db-manager.types.js'


export interface ProxyRefOptions {
  ctxBuilderPreProcessor: CtxBuilderPreProcessor | undefined
  ctxBuilderResultPreProcessor: CtxBuilderResultPreProcessor | undefined
  ctxExceptionHandler: CtxExceptionHandler | undefined
  dbSourceManager: DbSourceManager
  reqCtx: unknown
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  targetProperty: Dbqb | (Kmore[keyof Kmore])
  traceSvc: TraceService
  trxStatusSvc: TrxStatusService
}
export function proxyRef(options: ProxyRefOptions): Dbqb {
  const {
    dbSourceManager,
    reqCtx,
    targetProperty,
    traceSvc,
    trxStatusSvc,
    ctxBuilderPreProcessor,
    ctxBuilderResultPreProcessor,
    ctxExceptionHandler,
  } = options
  assert(targetProperty, 'targetProperty is empty')

  const ret = new Proxy(targetProperty, {
    get: (target: Dbqb, propKey: string) => {
      assert(
        typeof target[propKey] === 'function',
        `${propKey.toString()} is not a function`,
      )

      // eslint-disable-next-line @typescript-eslint/ban-types
      const queryBuilderCreator: TbQueryBuilder<{}, CaseType, {}, unknown> = inputOptions => proxyRefTableFn(
        inputOptions,
        {
          dbSourceManager,
          propKey,
          reqCtx,
          targetProperty: target,
          traceSvc,
          trxStatusSvc,
          ctxBuilderPreProcessor,
          ctxBuilderResultPreProcessor,
          ctxExceptionHandler,
        },
      )
      return queryBuilderCreator
    },
  })

  return ret as Dbqb
}

interface ProxyRefTableFnOptions extends ProxyRefOptions {
  propKey: string
}

function proxyRefTableFn(
  inputOptions: Partial<TbQueryBuilderOptions<unknown>> | undefined,
  options: ProxyRefTableFnOptions,
): KmoreQueryBuilder {

  const {
    dbSourceManager,
    propKey,
    reqCtx,
    targetProperty: target,
    traceSvc,
    trxStatusSvc,
    ctxBuilderPreProcessor,
    ctxBuilderResultPreProcessor,
    ctxExceptionHandler,
  } = options

  const globalBuilderPreProcessor: CtxBuilderPreProcessor = async (builder) => {
    let resp = { builder }
    if (ctxBuilderPreProcessor) {
      resp = await ctxBuilderPreProcessor(builder)
    }
    if (inputOptions?.ctxBuilderPreProcessor) {
      resp = await inputOptions.ctxBuilderPreProcessor(resp.builder)
    }
    return resp
  }
  const globalBuilderResultPreProcessor: CtxBuilderResultPreProcessor
    = async (options2: CtxBuilderResultPreProcessorOptions) => {

      let resp = options2.response
      if (ctxBuilderResultPreProcessor) {
        resp = await ctxBuilderResultPreProcessor(options2)
      }
      if (inputOptions?.ctxBuilderResultPreProcessor) {
        const opts2 = {
          ...options2,
          response: resp,
        }
        resp = await inputOptions.ctxBuilderResultPreProcessor(opts2)
      }
      return resp
    }

  const globalExceptionHandler: CtxExceptionHandler
    = async (options2: CtxExceptionHandlerOptions) => {

      const { exception } = options2
      let pm = Promise.reject(exception instanceof Error
        ? exception
        : new Error('[kmore-component] globalExceptionHandler error:', { cause: exception }))
      if (ctxExceptionHandler) {
        pm = pm.catch(ex => ctxExceptionHandler({ ...options2, exception: ex }))
      }
      if (inputOptions?.ctxExceptionHandler) {
        // @ts-expect-error
        pm = pm.catch(ex => inputOptions.ctxExceptionHandler({ ...options2, exception: ex }))
      }
      return pm
    }

  const inputOptions2: Partial<TbQueryBuilderOptions<unknown>> = {
    ctx: inputOptions?.ctx ?? reqCtx,
    ctxBuilderPreProcessor: globalBuilderPreProcessor,
    ctxBuilderResultPreProcessor: globalBuilderResultPreProcessor,
    ctxExceptionHandler: globalExceptionHandler,
  }
  const args: [Partial<TbQueryBuilderOptions<unknown>>] = [inputOptions2]

  // @ts-ignore
  const builder = target[propKey](...args) as KmoreQueryBuilder
  assert(builder, 'builder is empty')
  assert(typeof builder.transacting === 'function', 'builder.transacting is not a function')

  const opts: ProxyBuilderOptions = {
    dbSourceManager,
    propKey,
    targetProperty: builder,
    traceSvc,
  }
  const builder2 = proxyBuilder(opts)
  const builder3 = trxStatusSvc.bindBuilderPropagationData(builder2, 2)
  return builder3
}



interface ProxyBuilderOptions {
  dbSourceManager: DbSourceManager
  propKey: string
  targetProperty: KmoreQueryBuilder
  traceSvc: TraceService
}
function proxyBuilder(options: ProxyBuilderOptions): KmoreQueryBuilder {
  let builder = options.targetProperty
  builderKeys.forEach((key) => {
    switch (key) {
      case BuilderKeys.transacting: {
        const opts: ProxyBuilderOptions = {
          ...options,
          targetProperty: builder,
        }
        builder = transacting(key, opts)
        break
      }

      default:
        throw new TypeError(`unknown propKey: ${key.toString()}`)
    }
  })

  return builder
}

function transacting(key: string, options: ProxyBuilderOptions): KmoreQueryBuilder {
  const { dbSourceManager, traceSvc, targetProperty } = options
  if (! traceSvc.isStarted) {
    return targetProperty
  }

  // @ts-ignore
  assert(typeof targetProperty[key] === 'function', `targetProperty.${key} is not a function`)

  // @ts-ignore
  const ts = new Proxy(targetProperty[key], {
    apply: (target: KmoreQueryBuilder['transacting'], thisBinding, args: [KmoreTransaction]) => {
      const [trx] = args
      assert(trx, 'trx is empty when calling builder.transacting()')
      assert(trx.kmoreTrxId, 'trx.kmoreTrxId is empty when calling builder.transacting(). May calling db.dbh.transaction(), use db.transaction() instead')

      const builder = Reflect.apply(target, thisBinding, args)

      const querySpanInfo = dbSourceManager.trxSpanMap.get(trx.kmoreTrxId)
      if (querySpanInfo) {
        const event: Attributes = {
          event: KmoreAttrNames.TrxTransacting,
          // @ts-ignore
          table: builder._single?.table,
          // @ts-ignore
          method: builder._method,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          kmoreQueryId: thisBinding?.kmoreQueryId.toString(),
          time: genISO8601String(),
        }
        traceSvc.addEvent(querySpanInfo.span, event)
      }

      return builder
    },
  })
  void Object.defineProperty(targetProperty, key, {
    configurable: false,
    enumerable: true,
    writable: false,
    value: ts,
  })

  return targetProperty
}

