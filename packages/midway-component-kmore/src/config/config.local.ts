import { initDbConfig } from '##/lib/config.js'
import { Config } from '##/lib/index.js'


export const kmoreConfig: Config = {
  enableDefaultRoute: true,
  dataSource: {},
  default: {
    ...initDbConfig,
    sampleThrottleMs: 200,
  },
}


