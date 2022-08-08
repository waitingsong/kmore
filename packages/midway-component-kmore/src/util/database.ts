import { DbSourceManager } from '..'

import { Context } from '~/interface'


/**
 * Rollback or commit all uncommitted transaction
 */
export async function rollbackAndCleanCtxTransactions(ctx: Context): Promise<void> {
  const container = ctx.app.getApplicationContext()

  const dbSourceManager = await container.getAsync(DbSourceManager)
  for (const [, db] of dbSourceManager.dataSource.entries()) {
    const { trxMap } = db
    if (! trxMap.size) {
      continue
    }
    for (const [,trx] of trxMap.entries()) {
      await db.doTrxActionOnError(trx)
    }
  }

}

