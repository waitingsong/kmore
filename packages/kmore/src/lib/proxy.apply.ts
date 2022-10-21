import assert from 'node:assert'

import { KmoreBase } from './base.js'
import { defaultPropDescriptor } from './config.js'
import { KmoreQueryBuilder, KmoreTransaction } from './types.js'


export function builderApplyTransactingProxy(
  kmore: KmoreBase,
  refTable: KmoreQueryBuilder,
  ctx: unknown,
): KmoreQueryBuilder {

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const applyTransactingProxy = new Proxy(refTable.transacting, {
    apply: (
      target: KmoreQueryBuilder['transacting'],
      ctx2: KmoreQueryBuilder,
      args: [KmoreTransaction],
    ) => {

      const [trx] = args
      assert(trx?.isTransaction === true, 'trx must be a transaction')
      const { kmoreTrxId } = trx
      const qid = ctx2.kmoreQueryId as symbol | undefined
      if (qid && kmoreTrxId) {
        const st = kmore.trxIdQueryMap.get(kmoreTrxId)
        assert(
          st,
          'Transaction already completed, may committed or rollbacked already. trxIdQueryMap not contains kmoreTrxId:'
              + kmoreTrxId.toString(),
        )
        st.add(qid)
        kmore.setCtxTrxIdMap(ctx, kmoreTrxId)
      }
      return Reflect.apply(target, ctx2, args)
    },
  })
  void Object.defineProperty(refTable, 'transacting', {
    ...defaultPropDescriptor,
    writable: true,
    value: applyTransactingProxy,
  })

  return refTable
}
