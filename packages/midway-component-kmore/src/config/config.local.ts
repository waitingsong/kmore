import { initDbConfig } from '##/lib/config.js'
import type { Config } from '##/lib/index.js'


export const keys = 123456
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


