import { TraceService } from '@mwcp/otel'
import type { Context } from '@mwcp/share'

import { DbSourceManager } from '##/lib/db-source-manager.js'
import type { TraceFinishTrxOptions } from '##/lib/tracer-helper.js'
import { traceFinishTrx } from '##/lib/tracer-helper.js'


/**
 * Rollback or Commit all uncommitted transaction
 */
export async function rollbackAndCleanCtxTransactions(ctx: Context): Promise<void> {
  const container = ctx.app.getApplicationContext()
  const dbSourceManager = await container.getAsync(DbSourceManager)

  for (const [name, kmore] of dbSourceManager.dataSource.entries()) {
    const trxSet = kmore.getTrxSetByCtx(ctx)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (! trxSet?.size) { continue }

    for (const trx of trxSet.values()) {
      const { trxActionOnEnd, kmoreTrxId } = trx
      if (! trx.isCompleted()) {
        const msg = `[Kmore]: middleware auto transaction action: ${trxActionOnEnd} for ${name}: ${kmoreTrxId.toString()}`
        ctx.logger.info(msg)
      }
      // void else

      if (trx.trxPropagateOptions) {
        const msg = `[Kmore]: NOT processed transaction trx, middleware auto transaction action: ${trxActionOnEnd} for ${name}: ${kmoreTrxId.toString()}`
        ctx.logger.warn(msg)
      }

      // eslint-disable-next-line no-await-in-loop
      await kmore.finishTransaction(trx)

      // eslint-disable-next-line no-await-in-loop
      const traceSvc = await container.getAsync(TraceService)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (traceSvc) {
        const opts: TraceFinishTrxOptions = {
          dbId: name,
          isAuto: true,
          kmoreTrxId,
          trxAction: trxActionOnEnd,
          traceSvc,
          trxSpanMap: dbSourceManager.trxSpanMap,
        }
        traceFinishTrx(opts)
      }
    }

    kmore.ctxTrxIdMap.delete(ctx)
  }
}

