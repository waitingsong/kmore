import assert from 'node:assert'

import type { KmoreTransaction, TrxPropagateOptions } from 'kmore'
import { QueryBuilderExtKey } from 'kmore'

import { traceGenTrx } from './propagating.helper.js'
import type { PropagatingOptions, TrxStatusServiceBase } from './trx-status.base.js'
import { genCallerKey } from './trx-status.helper.js'


export async function genTrxRequired(
  trxStatusSvc: TrxStatusServiceBase,
  options: PropagatingOptions,
  trxPropagateOptions: TrxPropagateOptions,
): Promise<KmoreTransaction> {

  const { db, builder, scope } = options
  assert(scope, 'scope is undefined')

  const key = genCallerKey(trxPropagateOptions.className, trxPropagateOptions.funcName)
  let trx: KmoreTransaction | undefined = trxStatusSvc.pickActiveTrx(scope, db)
  if (! trx) {
    const pkey = trxStatusSvc.retrieveTopCallerKeyArrayByCallerKey(db.dbId, scope, key).at(-1) ?? key
    trx = await trxStatusSvc.startNewTrx(scope, db, pkey)
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
      options.dbSourceManager,
    )
  }

  return trx
}
