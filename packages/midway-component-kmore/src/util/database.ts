import type { Context } from '@mwcp/share'

import { DbSourceManager } from '../lib/db-source-manager'


/**
 * Rollback or Commit all uncommitted transaction
 */
export async function rollbackAndCleanCtxTransactions(ctx: Context): Promise<void> {
  const container = ctx.app.getApplicationContext()
  const dbSourceManager = await container.getAsync(DbSourceManager)

  for (const [name, kmore] of dbSourceManager.dataSource.entries()) {
    const trxSet = kmore.getTrxSetByCtx(ctx)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (! trxSet || ! trxSet.size) { continue }

    for (const trx of trxSet.values()) {
      const { trxActionOnEnd, kmoreTrxId } = trx
      if (! trx.isCompleted()) {
        const msg = `[Kmore]: middleware auto transaction action: ${trxActionOnEnd} for ${name}: ${kmoreTrxId.toString()}`
        ctx.logger.info(msg)
      }
      // void else

      // eslint-disable-next-line no-await-in-loop
      await kmore.finishTransaction(trx)
    }

    kmore.ctxTrxIdMap.delete(ctx)
  }
}

