import { KmoreTransaction, QueryBuilderExtKey } from 'kmore'

import { traceGenTrx } from './propagating.helper'
import { AbstractTrxStatusService, PropagatingOptions, TrxPropagateOptions } from './trx-status.abstract'


export async function genTrxSupports(
  trxStatusSvc: AbstractTrxStatusService,
  options: PropagatingOptions,
  trxPropagateOptions: TrxPropagateOptions,
): Promise<KmoreTransaction | undefined> {

  const { db, builder, regContext } = options

  const trx: KmoreTransaction | undefined = trxStatusSvc.pickActiveTrx(regContext, db)
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
