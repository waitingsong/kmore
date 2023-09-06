import { KmoreTransaction, QueryBuilderExtKey, TrxPropagateOptions } from 'kmore'

import { traceGenTrx } from './propagating.helper.js'
import { PropagatingOptions, TrxStatusServiceBase } from './trx-status.base.js'


export async function genTrxSupports(
  trxStatusSvc: TrxStatusServiceBase,
  options: PropagatingOptions,
  trxPropagateOptions: TrxPropagateOptions,
): Promise<KmoreTransaction | undefined> {

  const { db, builder } = options

  const trx: KmoreTransaction | undefined = trxStatusSvc.pickActiveTrx(db)
  if (! trx) { return }

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
