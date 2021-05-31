import type { Context } from 'egg'

import { DbManager } from './lib/db-man'
import { KmoreComponentConfig } from './lib/types'


export { AutoConfiguration as Configuration } from './configuration'
export type { DbManager }
export * from './lib/types'


declare module '@midwayjs/core' {
  interface Context {
    dbManager?: DbManager
  }
}
declare module 'egg' {
  interface EggAppConfig {
    kmore: KmoreComponentConfig
  }
}
declare const dummy: Context

