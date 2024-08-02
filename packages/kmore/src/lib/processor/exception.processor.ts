import assert from 'node:assert'

import type { ExceptionHandlerOptions } from '##/lib/kmore.js'


export async function trxOnExceptionProcessor(options: ExceptionHandlerOptions): Promise<never> {
  const { kmore, builder, exception } = options

  const { kmoreQueryId, scope } = builder
  assert(kmoreQueryId, 'kmoreQueryId undefined')
  console.warn('trxOnExceptionProcessor()', kmoreQueryId, exception)

  const trx = kmore.getTrxByQueryId(kmoreQueryId, scope)
  if (trx) { // also processed on event `query-error`
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const trxActionOnError = trx.trxActionOnError ?? 'rollback'
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
