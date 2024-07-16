import { initDbConfig } from '##/lib/config.js'
import type { Config } from '##/lib/index.js'


export const keys = Date.now().toString()
export const koa = {
  port: 7001,
}
export const kmoreConfig: Config = {
  enableDefaultRoute: true,
  dataSource: {},
  default: {
    ...initDbConfig,
    sampleThrottleMs: 200,
  },
}


