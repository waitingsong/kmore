import assert from 'node:assert'

import type {
  Attributes,
  DecoratorContext,
  DecoratorTraceDataResp,
} from '@mwcp/otel'
import { genISO8601String } from '@waiting/shared-core'
import type { TransactionHookOptions } from 'kmore'

import type { KmoreAttrNames } from '../types.js'


export interface ProcessTrxCommitAndRollbackData {
  eventName: KmoreAttrNames
  hook: string
  stage: 'before' | 'after'
  op: 'commit' | 'rollback'
}

export function processTrxCommitAndRollback(
  options: TransactionHookOptions,
  decoratorContext: DecoratorContext,
  data: ProcessTrxCommitAndRollbackData,
): DecoratorTraceDataResp {

  const { hook, op, stage, eventName } = data

  const { kmore, trx } = options
  const time = genISO8601String()

  const { traceService, traceSpan } = decoratorContext
  assert(traceService, 'traceService is empty')
  assert(traceSpan, 'traceSpan is empty')

  const attrs: Attributes = { op }

  const events: Attributes = {
    event: eventName,
    dbId: kmore.dbId,
    time,
    kmoreTrxId: trx.kmoreTrxId.toString(),
  }

  const ret: DecoratorTraceDataResp = { attrs, events }

  if (trx.trxPropagateOptions?.entryKey) { // end span for propagated trx, current trx is the entry trx
    ret.endSpanAfterTraceLog = true
    return ret
  }

  const { traceScope } = decoratorContext
  if (traceScope) {
    const scopeRootSpan2 = traceService.getRootSpan(traceScope)
    if (scopeRootSpan2 && scopeRootSpan2 === traceSpan) {
      ret.endSpanAfterTraceLog = true
    }
    return ret
  }

  const { scope } = trx
  assert(scope, `${hook}.${stage}-${op.toUpperCase()} trx.scope is empty`)
  const scopeRootSpan = traceService.getRootSpan(scope)
  if (scopeRootSpan && scopeRootSpan === traceSpan) {
    ret.endSpanAfterTraceLog = true
  }

  return ret
}

