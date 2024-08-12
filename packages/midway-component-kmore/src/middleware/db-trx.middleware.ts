import { Middleware, Inject } from '@midwayjs/core'
import type { Context, IMiddleware, NextFunction } from '@mwcp/share'

import { ConfigKey, TrxStatusService } from '##/lib/index.js'
import { processUnCommittedTransaction } from '##/util/database.js'


@Middleware()
export class KmoreMiddleware implements IMiddleware<Context, NextFunction> {

  @Inject() readonly trxStatusSvc: TrxStatusService

  static getName(): string {
    const name = ConfigKey.middlewareName
    return name
  }

  match(ctx?: Context) {
    const flag = !! ctx
    return flag
  }

  resolve() {
    return (ctx: Context, next: NextFunction) => {
      return middleware(ctx, next, this.trxStatusSvc)
    }
  }

}

/**
 * Rollback all uncommitted transaction stored on ctx.dbTransactions
 */
async function middleware(
  ctx: Context,
  next: NextFunction,
  trxStatusService: TrxStatusService,
): Promise<void> {

  try {
    await next()
  }
  // catch (ex) {
  //   console.warn('error inner kmore middleware', ex)
  //   throw ex
  // }
  finally {
    try {
      await processUnCommittedTransaction(ctx)
    }
    catch (ex) {
      console.error('error rollbackAndCleanCtxTransactions', ex)
    }
    trxStatusService.cleanAfterRequestFinished(ctx)
  }
}

