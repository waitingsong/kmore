import assert from 'node:assert'
import { hrtime } from 'node:process'

import type { KmoreBase } from './base.js'
import { defaultPropDescriptor } from './config.js'
import type { KmoreTransaction, KmoreTransactionConfig } from './types.js'
import { genKmoreTrxId } from './util.js'


export function trxApplyCommandProxy(
  kmore: KmoreBase,
  trx: KmoreTransaction,
): KmoreTransaction {

  assert(kmore, 'kmore must be provided')

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const commit = new Proxy(trx.commit, {
    apply: (target: typeof trx.commit, ctx: KmoreTransaction, args: unknown[]) => {
      kmore.trxIdQueryMap.delete(ctx.kmoreTrxId)
      kmore.trxMap.delete(ctx.kmoreTrxId)
      if (ctx.isCompleted()) { return }
      return Reflect.apply(target, ctx, args)
    },
  })
  Object.defineProperty(trx, 'commit', {
    ...defaultPropDescriptor,
    writable: true,
    value: commit,
  })

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const rollback = new Proxy(trx.rollback, {
    apply: (target: typeof trx.rollback, ctx: KmoreTransaction, args: unknown[]) => {
      kmore.trxIdQueryMap.delete(ctx.kmoreTrxId)
      kmore.trxMap.delete(ctx.kmoreTrxId)
      if (ctx.isCompleted()) { return }
      return Reflect.apply(target, ctx, args)
    },
  })
  Object.defineProperty(trx, 'rollback', {
    ...defaultPropDescriptor,
    writable: true,
    value: rollback,
  })

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const savepoint = new Proxy(trx.savepoint, {
    apply: async (_target: typeof trx.savepoint, ctx: KmoreTransaction, args?: unknown[]) => {
      if (args && typeof args[0] === 'function') {
        const msg = `trx.savepoint(arg) arg not support function,
          args should be [name?: PropertyKey, config?: KmoreTransactionConfig]`
        throw new Error(msg)
      }

      const arg0 = args?.[0] as KmoreTransactionConfig | undefined
      const trx2 = await ctx.transaction(arg0) as KmoreTransaction
      const trx3 = savePointTrx({
        kmore,
        trx: trx2,
        parentTrx: ctx,
      })
      return trx3
    },
  })
  Object.defineProperty(trx, 'savepoint', {
    ...defaultPropDescriptor,
    writable: true,
    value: savepoint,
  })

  kmore.trxMap.set(trx.kmoreTrxId, trx)
  kmore.trxIdQueryMap.set(trx.kmoreTrxId, new Set())

  return trx
}


interface CreateTrxPropertiesOptions {
  kmore: KmoreBase
  kmoreTrxId: PropertyKey
  trx: KmoreTransaction
  trxActionOnEnd: KmoreTransactionConfig['trxActionOnEnd']
}

export function createTrxProperties(options: CreateTrxPropertiesOptions): KmoreTransaction {
  const { trx, kmore, kmoreTrxId, trxActionOnEnd } = options

  Object.defineProperty(trx, 'hrtime', {
    ...defaultPropDescriptor,
    enumerable: false,
    value: hrtime.bigint(),
  })

  Object.defineProperty(trx, 'dbId', {
    ...defaultPropDescriptor,
    enumerable: false,
    value: kmore.dbId,
  })

  Object.defineProperty(trx, 'kmoreTrxId', {
    ...defaultPropDescriptor,
    enumerable: false,
    value: kmoreTrxId,
  })

  Object.defineProperty(trx, 'trxActionOnEnd', {
    ...defaultPropDescriptor,
    enumerable: false,
    value: trxActionOnEnd,
  })

  if (trxActionOnEnd === 'none') {
    return trx
  }

  const trx2 = trxApplyCommandProxy(kmore, trx)
  return trx2
}


interface SavePointTrxOptions {
  kmore: KmoreBase
  parentTrx: KmoreTransaction
  trx: KmoreTransaction
}
function savePointTrx(options: SavePointTrxOptions): KmoreTransaction {
  const { kmore, parentTrx, trx } = options
  const { trxActionOnEnd } = parentTrx

  assert(parentTrx.isTransaction === true, 'parent trx not a transaction when creating savepoint')
  const kmoreTrxId = genKmoreTrxId(parentTrx.kmoreTrxId)
  assert(kmoreTrxId, 'kmoreTrxId must be provided from parent trx when creating savepoint')

  assert(trx.isTransaction === true, 'output trx not a transaction when creating savepoint')
  assert(! trx.isCompleted(), 'output trx already completed when creating savepoint')

  const opts: CreateTrxPropertiesOptions = {
    kmore,
    kmoreTrxId,
    trx,
    trxActionOnEnd,
  }
  const trxNew = createTrxProperties(opts)
  return trxNew
}

