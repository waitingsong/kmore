import assert from 'node:assert'

import { Attributes, AttrNames } from '@mwcp/otel'
import { KmoreTransaction, QueryBuilderExtKey, TrxPropagateOptions } from 'kmore'

import { PropagatingOptions, TrxStatusServiceBase } from './trx-status.base'
import { genCallerKey, trxTrace } from './trx-status.helper'


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

  if (! trx.trxPropagateOptions) {
    Object.defineProperty(trx, QueryBuilderExtKey.trxPropagateOptions, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: trxPropagateOptions,
    })
  }

  const querySpanInfo = trxStatusSvc.dbSourceManager.getSpanInfoByKmoreTrxId(trx.kmoreTrxId)
  if (! querySpanInfo) {
    return trx
  }

  const event: Attributes = {
    event: AttrNames.TransactionalStart,
    kmoreQueryId: builder.kmoreQueryId.toString(),
  }

  trxTrace({
    type: 'event',
    appDir: trxStatusSvc.appDir,
    span: querySpanInfo.span,
    traceSvc: trxStatusSvc.traceSvc,
    trxPropagateOptions,
    attr: event,
  })

  if (! trx.trxPropagateOptions) {
    trxTrace({
      type: 'tag',
      appDir: trxStatusSvc.appDir,
      span: querySpanInfo.span,
      traceSvc: trxStatusSvc.traceSvc,
      trxPropagateOptions,
    })
  }

  return trx
}
