
import { IMidwayApplication, IMidwayContext } from '@midwayjs/core'
import { Context as KoaContext } from '@midwayjs/koa'


export { TracerLog } from '@mw-components/jaeger'
export {
  JsonObject,
  JsonResp,
  JsonType,
  MiddlewareConfig,
  NpmPkg,
} from '@waiting/shared-types'

export {
  IMidwayApplication,
  IMidwayContainer,
  IMiddleware,
  NextFunction,
} from '@midwayjs/core'
export type Application = IMidwayApplication<Context>
export type Context = IMidwayContext<KoaContext>

