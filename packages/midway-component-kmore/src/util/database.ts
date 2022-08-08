import { DbSourceManager } from '../lib/db-source-manager'

import type { Context } from '~/interface'


/**
 * Rollback or Commit all uncommitted transaction
 */
export async function rollbackAndCleanCtxTransactions(ctx: Context): Promise<void> {
  const container = ctx.app.getApplicationContext()

  const dbSourceManager = await container.getAsync(DbSourceManager)
  for (const [name, kmore] of dbSourceManager.dataSource.entries()) {
    const trxSet = kmore.getTrxSetByCtx(ctx)
    if (! trxSet || ! trxSet.size) { continue }

    for (const trx of trxSet.values()) {
      const { trxActionOnError, kmoreTrxId } = trx
      if (! trx.isCompleted()) {
        ctx.logger.info(
          `[Kmore]: middleware auto transaction action: ${trxActionOnError} for ${name}: ${kmoreTrxId.toString()}`,
        )
      }
      await kmore.doTrxActionOnError(trx)
    }

    kmore.ctxTrxIdMap.delete(ctx)
  }
}

