import { DbDict } from 'kmore'

import { KmoreComponentConfig } from '../lib/types'


export const kmore: KmoreComponentConfig = {
  master: {
    autoConnect: true,
    config: {},
    dict: {} as DbDict<unknown>,
    enableTracing: false,
    sampleThrottleMs: 300,
  },
}

