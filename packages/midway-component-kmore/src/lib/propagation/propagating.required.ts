import assert from 'node:assert'

import { KmoreTransaction, QueryBuilderExtKey, TrxPropagateOptions } from 'kmore'

import { traceGenTrx } from './propagating.helper'
import { PropagatingOptions, AbstractTrxStatusService } from './trx-status.abstract'
import { genCallerKey } from './trx-status.helper'


export async function genTrxRequired(
  trxStatusSvc: AbstractTrxStatusService,
  options: PropagatingOptions,
  trxPropagateOptions: TrxPropagateOptions,
): Promise<KmoreTransaction> {

  const { db, builder, regContext } = options

  const key = genCallerKey(trxPropagateOptions.className, trxPropagateOptions.funcName)
  let trx: KmoreTransaction | undefined = trxStatusSvc.pickActiveTrx(regContext, db)
  if (! trx) {
    const pkey = trxStatusSvc.retrieveTopCallerKeyArrayByCallerKey(regContext, key).at(-1) ?? key
    trx = await trxStatusSvc.startNewTrx(regContext, db, pkey)
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
