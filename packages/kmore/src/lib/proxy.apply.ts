import assert from 'node:assert'

import { KmoreBase } from './base.js'
import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { KmoreTransaction } from './types.js'


export function builderApplyTransactingProxy(
  kmore: KmoreBase,
  refTable: KmoreQueryBuilder,
  ctx: unknown,
): KmoreQueryBuilder {

  void Object.defineProperty(refTable, '_ori_transacting', {
    ...defaultPropDescriptor,
    writable: true,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    value: refTable.transacting,
  })

  void Object.defineProperty(refTable, 'transacting', {
    ...defaultPropDescriptor,
    writable: true,
    value: (...args: [KmoreTransaction]) => customTransacting.call(refTable, {
      kmore,
      ctx,
      args,
    }),
  })

  return refTable
}

interface CustomTransactingOptions {
  kmore: KmoreBase
  ctx: unknown
  args: [KmoreTransaction]
}

function customTransacting(this: KmoreQueryBuilder, options: CustomTransactingOptions): Promise<unknown> {
  const { args, ctx, kmore } = options

  const [trx] = args
  assert(trx.isTransaction === true, 'trx must be a transaction')
  const { kmoreTrxId } = trx
  assert(kmoreTrxId, 'trx.kmoreTrxId must be provided when .transacting(trx)')

  const qid = this.kmoreQueryId
  assert(qid, 'trx.kmoreQueryId must be provided when .transacting(trx)')

  const qidSet = kmore.trxIdQueryMap.get(kmoreTrxId)
  assert(
    qidSet,
    'Transaction already completed, may committed or rollback already. trxIdQueryMap not contains kmoreTrxId:'
    + kmoreTrxId.toString(),
  )
  qidSet.add(qid)
  kmore.setCtxTrxIdMap(ctx, kmoreTrxId)

  // @ts-expect-error method
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return this._ori_transacting(...args)
}

/*
export function extRefTableFnPropertyThen(
  kmore: KmoreBase,
  refTable: KmoreQueryBuilder,
  _ctx: unknown,
): KmoreQueryBuilder {

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const applyThenProxy = new Proxy(refTable.then, {
    apply: async (
      target: () => Promise<unknown>,
      ctx2: KmoreQueryBuilder,
      args: unknown[],
    ) => {

      try {
        // query response or response data
        // undefined means calling builder without tailing then(),
        const resp = await Reflect.apply(target, ctx2, args) as unknown
        return resp
      }
      catch (ex) {
        const qid = ctx2.kmoreQueryId
        const trx = kmore.getTrxByKmoreQueryId(qid)
        if (trx) {
          await kmore.finishTransaction(trx)
        }
        throw ex
      }
    },
  })
  void Object.defineProperty(refTable, 'then', {
    ...defaultPropDescriptor,
    configurable: true,
    value: applyThenProxy,
  })

  return refTable
}
*/

