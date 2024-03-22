/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'
// import { isProxy } from 'node:util/types'

import type { Attributes, TraceService } from '@mwcp/otel'
import { genISO8601String } from '@waiting/shared-core'
import {
  Kmore,
  KmoreTransaction,
  QuerySpanInfo,
} from 'kmore'

import { DbSourceManager } from '../db-source-manager.js'
import { traceCommitRollbackTrx, TraceCommitRollbackTrxOptions } from '../tracer-helper.js'
import { KmoreAttrNames } from '../types.js'

import { BuilderKeys, Dbqb } from './db-manager.types.js'


export interface ProxyKnexOptions {
  dbSourceManager: DbSourceManager
  propKey: string
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  targetProperty: Dbqb | (Kmore[keyof Kmore])
  traceSvc: TraceService
}
export function proxyKnex(options: ProxyKnexOptions): ProxyKnexOptions['targetProperty'] {
  switch (options.propKey) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case BuilderKeys.transaction: {
      if (options.traceSvc.isStarted) {
        return knexTransactionTracing(options)
      }
      return options.targetProperty
    }

    default:
      throw new TypeError(`unknown propKey: ${options.propKey}`)
  }
}

interface ProxyOptionsKnexTransaction extends ProxyKnexOptions {
  targetProperty: Kmore['transaction']
}
function knexTransactionTracing(options: ProxyOptionsKnexTransaction): ProxyOptionsKnexTransaction['targetProperty'] {

  const { dbSourceManager, traceSvc, targetProperty } = options
  assert(typeof targetProperty === 'function', 'targetProperty is not a function transaction()')

  const ret = new Proxy(targetProperty, {
    apply: async (target, thisBinding, args) => {
      const { span, traceContext } = dbSourceManager.createSpan(traceSvc, { name: 'Kmore transaction' })
      const querySpanInfo: QuerySpanInfo = {
        span,
        traceContext,
        timestamp: Date.now(),
      }

      const event: Attributes = {
        event: KmoreAttrNames.TrxBeginStart,
        time: genISO8601String(),
      }
      traceSvc.addEvent(span, event)
      const trx = await Reflect.apply(target, thisBinding, args) as KmoreTransaction
      assert(trx.kmoreTrxId, 'trx.kmoreTrxId is empty when calling db.transaction()')

      const event2: Attributes = {
        event: KmoreAttrNames.TrxBeginEnd,
        time: genISO8601String(),
      }
      traceSvc.addEvent(span, event2)

      dbSourceManager.trxSpanMap.set(trx.kmoreTrxId, querySpanInfo)

      const trxOpts: TrxCommitRollbackOptions = {
        dbSourceManager,
        op: 'commit',
        targetProperty: trx,
        traceSvc,
      }
      createProxyTrxCommitRollback(trxOpts)
      trxOpts.op = 'rollback'
      createProxyTrxCommitRollback(trxOpts)

      const { dbId } = trx
      const kmoreTrxIdStr = trx.kmoreTrxId.toString()

      const name = `Kmore ${dbId} transaction`
      span.updateName(name)

      const attr: Attributes = {
        dbId,
        kmoreTrxId: kmoreTrxIdStr,
      }
      traceSvc.setAttributesLater(span, attr)

      return trx
    },
  })

  return ret
}


interface TrxCommitRollbackOptions {
  dbSourceManager: DbSourceManager
  op: 'commit' | 'rollback'
  targetProperty: KmoreTransaction
  traceSvc: TraceService
}
function createProxyTrxCommitRollback(options: TrxCommitRollbackOptions): KmoreTransaction {
  const { op, dbSourceManager, traceSvc, targetProperty: trx } = options

  assert(['commit', 'rollback'].includes(op), `unknown op: ${op}`)
  assert(typeof trx[op] === 'function', `trx.${op} is not a function`)

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (! traceSvc?.isStarted) {
    return trx
  }

  const backName = `__${op}__`
  // @ts-ignore
  if (typeof trx[backName] === 'function') {
    console.warn(`trx.${backName} is already a function, skip`)
    return trx
  }

  void Object.defineProperty(trx, backName, {
    writable: true,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    value: trx[op],
  })
  // @ts-ignore
  assert(typeof trx[backName] === 'function', `trx.${backName} is not a function`)

  const fn = async (data?: unknown) => {
    const opts: TraceCommitRollbackTrxOptions = {
      dbId: trx.dbId,
      kmoreTrxId: trx.kmoreTrxId,
      stage: 'start',
      traceSvc,
      trxAction: op,
      trxSpanMap: dbSourceManager.trxSpanMap,
    }
    traceCommitRollbackTrx(opts)

    // @ts-ignore
    const builder = await trx[backName](data)

    opts.stage = 'end'
    traceCommitRollbackTrx(opts)
    return builder
  }
  void Object.defineProperty(trx, op, {
    enumerable: true,
    writable: false,
    value: fn,
  })

  return trx
}
