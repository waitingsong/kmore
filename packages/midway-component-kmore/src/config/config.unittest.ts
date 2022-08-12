import { DataSourceConfig } from '../index'
import { initDbConfig } from '../lib/config'


export const kmoreDataSourceConfig: DataSourceConfig = {
  dataSource: {},
  default: {
    ...initDbConfig,
    sampleThrottleMs: 200,
  },
}


