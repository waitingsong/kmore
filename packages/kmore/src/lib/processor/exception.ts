import assert from 'node:assert'

import type { ExceptionHandlerOptions } from '##/lib/base.js'


export async function trxOnExceptionProcessor(options: ExceptionHandlerOptions): Promise<never> {
  const { kmore, kmoreQueryId, exception } = options

  assert(kmoreQueryId, 'kmoreQueryId undefined')
  console.error('processTrxOnEx', kmoreQueryId, exception)

  const trx = kmore.getTrxByKmoreQueryId(kmoreQueryId)
  if (trx) { // also processed on event `query-error`
    await kmore.finishTransaction(trx, 'rollback')
  }
  throw exception
}
