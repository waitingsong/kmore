import type { DbDict } from 'kmore-types'

import { KmoreComponentConfig } from '../lib/types'


export const kmore: KmoreComponentConfig = {
  defaultMaxListeners: 200,
  dbConfigs: {
    master: {
      autoConnect: true,
      config: {},
      dict: {} as DbDict<unknown>,
      enableTracing: false,
      tracingResponse: true,
      sampleThrottleMs: 300,
    },
  },
  timeoutWhenDestroy: 2000,
}

