import type { Context } from '@mwcp/share'

import { DbManager } from '##/lib/db-source-manager.js'


/**
 * Rollback or Commit all uncommitted transaction
 */
export async function processUnCommittedTransaction(ctx: Context): Promise<void> {
  const container = ctx.app.getApplicationContext()
  const dbSourceManager = await container.getAsync(DbManager)

  for (const [name, kmore] of dbSourceManager.getAllDataSources()) {
    const trxSet = kmore.getTrxListByScope(ctx)
    if (! trxSet.size) { continue }

    for (const trx of trxSet.values()) {
      const { trxActionOnError, kmoreTrxId } = trx
      if (! trx.isCompleted()) {
        const msg = `[Kmore]: middleware auto transaction action: ${trxActionOnError} for ${name}: ${kmoreTrxId.toString()}`
        ctx.logger.info(msg)
      }
      // void else

      if (trx.trxPropagateOptions) {
        const msg = `[Kmore]: unprocessed transaction, middleware auto transaction action: ${trxActionOnError} for ${name}: ${kmoreTrxId.toString()}`
        ctx.logger.info(msg)
      }


      await kmore.finishTransaction({ trx, scope: ctx })

      // // eslint-disable-next-line no-await-in-loop
      // const traceSvc = await container.getAsync(TraceService)
      // // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      // if (traceSvc) {
      //   const opts: TraceFinishTrxOptions = {
      //     dbSourceManager,
      //     dbId: name,
      //     isAuto: true,
      //     kmoreTrxId,
      //     trxAction: trxActionOnError,
      //   }
      //   traceFinishTrx(opts)
      // }
    }

  }

}

