import { DbDict } from 'kmore'

import { KmoreComponentConfig } from '../lib/types'


export const kmore: KmoreComponentConfig = {
  master: {
    config: {},
    dict: {} as DbDict<unknown>,
    sampleThrottleMs: 300,
  },
}

