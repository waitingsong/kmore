import type { Attributes } from '@mwcp/otel'
import { AttrNames } from '@mwcp/otel'
import type { KmoreTransaction, TrxPropagateOptions } from 'kmore'

import type { TrxStatusServiceBase } from './trx-status.base.js'
import { trxTrace } from './trx-status.helper.js'


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
