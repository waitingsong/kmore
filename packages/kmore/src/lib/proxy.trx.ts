import assert from 'node:assert'
import { hrtime } from 'node:process'

import type { KmoreBase } from './base.js'
import { defaultPropDescriptor } from './config.js'
import { KmoreTransaction, KmoreTransactionConfig } from './types.js'


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
      return Reflect.apply(target, ctx, args)
    },
  })
  Object.defineProperty(trx, 'rollback', {
    ...defaultPropDescriptor,
    writable: true,
    value: rollback,
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


export function genKmoreTrxId(id?: PropertyKey): PropertyKey {
  if (! id) {
    return Symbol(`trx-${Date.now()}`)
  }
  else if (typeof id === 'string') {
    return Symbol(id)
  }

  const str = id.toString()
  if (str.startsWith('Symbol(trx-')) {
    const key = str.match(/Symbol\((trx-\S+)\)/u)?.[1]
    assert(key, 'retrieve key from id failed, input should like "Symbol(trx-1234567890)"')
    const key2 = `${key}-${Date.now()}`
    return Symbol(key2)
  }
  return id
}

