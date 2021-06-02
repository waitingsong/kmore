import type { Context } from 'egg'

import { DbManager } from './lib/db-man'
import { KmoreComponentConfig } from './lib/types'


export { AutoConfiguration as Configuration } from './configuration'
export { DbManager }
export * from './lib/types'
export { KmoreComponent } from './lib/kmore'

export {
  genDbDict, getCurrentTime,
} from 'kmore'


declare module '@midwayjs/core' {
  interface Context {
    dbManager?: DbManager
  }
}
declare module 'egg' {
  interface Application {
    dbManager: DbManager
  }
  interface EggAppConfig {
    kmore: KmoreComponentConfig
  }
}
declare const dummy: Context

