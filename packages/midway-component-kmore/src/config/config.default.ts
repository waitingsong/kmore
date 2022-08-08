import { Config, DataSourceConfig, MiddlewareConfig } from '../index'
import {
  initialConfig,
  initialMiddlewareConfig,
  initMiddlewareOptions,
} from '../lib/config'


export const kmoreDataSourceConfig: DataSourceConfig = {
  dataSource: { },
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

