import { DbDict } from 'kmore'

import { KmoreComponentConfig } from '../lib/types'


export const kmore: KmoreComponentConfig = {
  defaultMaxListeners: 100,
  database: {
    master: {
      autoConnect: true,
      config: {},
      dict: {} as DbDict<unknown>,
      enableTracing: false,
      sampleThrottleMs: 300,
    },
  },
  timeoutWhenDestroy: 2000,
}

