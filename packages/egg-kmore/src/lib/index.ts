/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import type { Kmore } from 'kmore'

import type { KmoreEggConfig } from './types'


export * from './config'
export * from './util'
export {
  ClientOptions,
  KmoreEggConfig,
} from './types'


declare module 'egg' {
  interface Application {
    kmore: Kmore
  }

  interface Agent {
    kmore: Kmore
  }

  interface EggAppConfig {
    kmore: KmoreEggConfig
  }
}

