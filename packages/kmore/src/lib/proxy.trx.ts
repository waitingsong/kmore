import assert from 'assert'

import type { KmoreBase } from './base.js'
import { defaultPropDescriptor } from './config.js'
import { KmoreTransaction } from './types.js'


export function createTrxProxy(
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

  return trx
}
