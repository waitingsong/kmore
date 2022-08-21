import { KmoreSourceConfig } from '../index'
import { initDbConfig } from '../lib/config'


export const kmoreConfig: KmoreSourceConfig = {
  dataSource: {},
  default: {
    ...initDbConfig,
    sampleThrottleMs: 200,
  },
}


