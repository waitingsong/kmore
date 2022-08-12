import { Config, DataSourceConfig, MiddlewareConfig } from '../index'
import {
  initDbConfig,
  initialConfig,
  initialMiddlewareConfig,
  initMiddlewareOptions,
} from '../lib/config'


export const kmoreDataSourceConfig: DataSourceConfig = {
  dataSource: {},
  default: {
    ...initDbConfig,
  },
}

export const kmoreConfig: Config = {
  ...initialConfig,
}

export const kmoreMiddlewareConfig: Readonly<Omit<MiddlewareConfig, 'match'>> = {
  ...initialMiddlewareConfig,
  ignore: [],
  options: {
    ...initMiddlewareOptions,
  },
}

