/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'
// import { isProxy } from 'node:util/types'

import { Attributes, TraceService } from '@mwcp/otel'
import type { Context } from '@mwcp/share'
import { genISO8601String } from '@waiting/shared-core'
import {
  CaseType,
  DbQueryBuilder,
  Kmore,
  KmoreQueryBuilder,
  KmoreTransaction,
  QuerySpanInfo,
} from 'kmore'

import { DbSourceManager } from './db-source-manager'
import { KmoreAttrNames } from './types'


export const refTableKeys = new Set<PropertyKey>([
  'camelTables',
  'refTables',
  'snakeTables',
  'pascalTables',
])
export const knexKeys = new Set<string>(['transaction'])
export const builderKeys = new Set<PropertyKey>(['transacting'])


type Dbb = DbQueryBuilder<Context, object, string, CaseType>

export function proxyRef(options: ProxyOptions): Dbb {
  const { dbSourceManager, reqCtx, targetProperty, traceSvc } = options
  assert(targetProperty, 'targetProperty is empty')

  const ret = new Proxy(targetProperty, {
    get: (target: Dbb, propKey: string) => {
      // @ts-ignore
      if (typeof target[propKey] === 'function') {
        const fn = (ctx?: unknown) => {
          const args: unknown[] = ctx ? [ctx] : [reqCtx]
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
          return builder2
        }
        return fn
      }

      throw new TypeError(`${propKey.toString()} is not a function`)
    },
  })

  return ret
}

export interface ProxyOptions {
  targetProperty: Dbb
  reqCtx: unknown
  propKey: string
  dbSourceManager: DbSourceManager
  traceSvc: TraceService
  func: () => any
}

export function proxyKnex(options: ProxyOptions): Dbb {
  switch (options.propKey) {
    case 'transaction':
      return knexTransaction(options)
    default:
      throw new TypeError(`unknown propKey: ${options.propKey}`)
  }
}

interface ProxyOptionsKnexTransaction extends ProxyOptions {
  func: Kmore['transaction']
}
function knexTransaction(options: ProxyOptionsKnexTransaction): Kmore['transaction'] {
  const { dbSourceManager, traceSvc, func } = options

  const ret = new Proxy(func, {
    apply: async (target, thisBinding, args) => {
      const { span, traceContext } = dbSourceManager.createSpan(traceSvc, { name: 'Kmore transaction' })
      const querySpanInfo: QuerySpanInfo = {
        span,
        traceContext,
        timestamp: Date.now(),
      }

      const trx = await Reflect.apply(target, thisBinding, args) as KmoreTransaction
      assert(trx.kmoreTrxId, 'trx.kmoreTrxId is empty when calling db.transaction()')
      const event: Attributes = {
        event: KmoreAttrNames.TrxBegin,
        time: genISO8601String(),
      }
      traceSvc.addEvent(span, event)

      dbSourceManager.trxSpanMap.set(trx.kmoreTrxId, querySpanInfo)

      new Promise<void>((done) => {
        const name = `Kmore ${trx.dbId} transaction`
        span.updateName(name)

        const attr: Attributes = {
          dbId: trx.dbId,
          kmoreTrxId: trx.kmoreTrxId.toString(),
        }
        traceSvc.setAttributes(span, attr)
        done()
      }).catch(console.warn)

      return trx
    },
  })

  return ret
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
      case 'transacting': {
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
      assert(trx.kmoreTrxId, 'trx.kmoreTrxId is empty when calling db.transaction()')

      const builder = Reflect.apply(target, thisBinding, args) as KmoreQueryBuilder

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
