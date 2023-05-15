import { Attributes, AttrNames } from '@mwcp/otel'
import { KmoreTransaction } from 'kmore'

import { AbstractTrxStatusService, TrxPropagateOptions } from './trx-status.abstract'
import { trxTrace } from './trx-status.helper'


export function traceGenTrx(
  kmoreQueryId: symbol,
  trx: KmoreTransaction,
  trxStatusSvc: AbstractTrxStatusService,
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
    otel: trxStatusSvc.otel,
    span: querySpanInfo.span,
    trxPropagateOptions,
    attr: event,
  })

  trxTrace({
    type: 'tag',
    appDir: trxStatusSvc.appDir,
    span: querySpanInfo.span,
    otel: trxStatusSvc.otel,
    trxPropagateOptions,
  })

}
