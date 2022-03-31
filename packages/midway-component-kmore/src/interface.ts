import { Context } from '@midwayjs/koa'

import { KmoreComponent, TracerKmoreComponent } from './lib/index'


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
export {
  Application, Context,
} from '@midwayjs/koa'


export type BindUnsubscribeEventFunc = (
  ctx: Context,
  kmoreInstance: KmoreComponent | TracerKmoreComponent,
) => void

