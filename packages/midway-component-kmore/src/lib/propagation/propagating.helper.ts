import { Attributes, AttrNames } from '@mwcp/otel'
import { KmoreTransaction, TrxPropagateOptions } from 'kmore'

import { TrxStatusServiceBase } from './trx-status.base'
import { trxTrace } from './trx-status.helper'


export function traceGenTrx(
  kmoreQueryId: symbol,
  trx: KmoreTransaction,
  trxStatusSvc: TrxStatusServiceBase,
  trxPropagateOptions: TrxPropagateOptions,
): void {

  const querySpanInfo = trxStatusSvc.dbSourceManager.getSpanInfoByKmoreTrxId(trx.kmoreTrxId)
  if (! querySpanInfo) { return }

  const event: Attributes = {
    event: AttrNames.TransactionalStart,
    kmoreQueryId: kmoreQueryId.toString(),
  }

  trxTrace({
    type: 'event',
    appDir: trxStatusSvc.appDir,
    span: querySpanInfo.span,
    traceSvc: trxStatusSvc.traceSvc,
    trxPropagateOptions,
    attr: event,
  })

  trxTrace({
    type: 'tag',
    appDir: trxStatusSvc.appDir,
    span: querySpanInfo.span,
    traceSvc: trxStatusSvc.traceSvc,
    trxPropagateOptions,
  })

}
