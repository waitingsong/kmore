import assert from 'node:assert'

import { TrxControl } from '../trx.types.js'

import type { ExceptionHookOptions } from './hook.types.js'


export async function trxOnExceptionProcessor(options: ExceptionHookOptions): Promise<never> {
  const { kmore, builder, exception } = options

  const { kmoreQueryId, scope } = builder
  assert(kmoreQueryId, 'kmoreQueryId undefined')
  console.warn('Error: trxOnExceptionProcessor()', kmoreQueryId, exception)

  const trx = kmore.getTrxByQueryId(kmoreQueryId, scope)
  if (trx) { // also processed on event `query-error`
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const trxActionOnError = trx.trxActionOnError ?? TrxControl.Rollback
    if (trxActionOnError !== 'none') {
      await kmore.finishTransaction({
        trx,
        action: trxActionOnError,
        scope: scope,
      })
    }
  }
  throw exception
}
