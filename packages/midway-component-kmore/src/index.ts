import type { Context } from 'egg'

import { DbManager } from './lib/db-man'
import { KmoreComponentConfig } from './lib/types'


export { AutoConfiguration as Configuration } from './configuration'
export { DbManager }
export * from './lib/types'
export type { KmoreComponent } from './lib/kmore'
export type { TracerKmoreComponent } from './lib/tracer-kmore'

export {
  genDbDict, getCurrentTime,
  Kmore, KmoreEvent, KnexConfig,
} from 'kmore'


declare module 'egg' {
  // interface Application {
  //   dbManager: DbManager
  // }
  interface EggAppConfig {
    kmore: KmoreComponentConfig
  }
}
declare const dummy: Context
