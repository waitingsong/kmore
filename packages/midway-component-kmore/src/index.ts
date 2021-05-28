import type { Context } from 'egg'

import { DbManager } from './lib/kmore'
import { KmoreComponentConfig } from './lib/types'


export { AutoConfiguration as Configuration } from './configuration'
export type { DbManager }
export * from './lib/types'


declare module '@midwayjs/core' {
  interface Context {
    dbManager: DbManager
  }
}
declare module 'egg' {
  interface Application {
    dbManager?: DbManager
  }
  interface EggAppConfig {
    kmore: KmoreComponentConfig
  }
}
declare const dummy: Context

