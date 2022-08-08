import { Middleware } from '@midwayjs/decorator'

import { Context, IMiddleware, NextFunction } from '../interface'
import { rollbackAndCleanCtxTransactions } from '../util/database'


@Middleware()
export class DbTrxMiddleware implements IMiddleware<Context, NextFunction> {

  static getName(): string {
    const name = 'dbTrxMiddleware'
    return name
  }

  match(ctx?: Context) {
    const flag = !! ctx
    return flag
  }

  resolve() {
    return middleware
  }

}

/**
 * Rollback all uncommitted transaction stored on ctx.dbTransactions
 */
async function middleware(
  ctx: Context,
  next: NextFunction,
): Promise<void> {

  try {
    await next()
  }
  finally {
    await rollbackAndCleanCtxTransactions(ctx)
  }
}

