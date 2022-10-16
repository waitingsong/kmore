import { Middleware } from '@midwayjs/decorator'
import type { Context, IMiddleware, NextFunction } from '@mwcp/share'

import { ConfigKey } from '../lib/index'
import { rollbackAndCleanCtxTransactions } from '../util/database'


@Middleware()
export class KmoreMiddleware implements IMiddleware<Context, NextFunction> {

  static getName(): string {
    const name = ConfigKey.middlewareName
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
  catch (ex) {
    console.warn('error in kmore middleware', ex)
    throw ex
  }
  finally {
    await rollbackAndCleanCtxTransactions(ctx)
  }
}

