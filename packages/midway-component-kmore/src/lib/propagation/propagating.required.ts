import assert from 'node:assert'

import { KmoreTransaction, QueryBuilderExtKey, TrxPropagateOptions } from 'kmore'

import { traceGenTrx } from './propagating.helper.js'
import { PropagatingOptions, TrxStatusServiceBase } from './trx-status.base.js'
import { genCallerKey } from './trx-status.helper.js'


export async function genTrxRequired(
  trxStatusSvc: TrxStatusServiceBase,
  options: PropagatingOptions,
  trxPropagateOptions: TrxPropagateOptions,
): Promise<KmoreTransaction> {

  const { db, builder } = options

  const key = genCallerKey(trxPropagateOptions.className, trxPropagateOptions.funcName)
  let trx: KmoreTransaction | undefined = trxStatusSvc.pickActiveTrx(db)
  if (! trx) {
    const pkey = trxStatusSvc.retrieveTopCallerKeyArrayByCallerKey(key).at(-1) ?? key
    trx = await trxStatusSvc.startNewTrx(db, pkey)
  }
  assert(trx, 'trx is undefined')

  const trxPropagated = !! trx.trxPropagateOptions

  if (! trxPropagated) {
    Object.defineProperty(trx, QueryBuilderExtKey.trxPropagateOptions, {
      value: trxPropagateOptions,
    })
    traceGenTrx(
      builder.kmoreQueryId,
      trx,
      trxStatusSvc,
      trxPropagateOptions,
    )
  }

  return trx
}
