import { KmoreSourceConfig, MiddlewareConfig } from '../index'
import {
  initDbConfig,
  initialMiddlewareConfig,
  initMiddlewareOptions,
} from '../lib/config'


export const kmoreConfig: KmoreSourceConfig = {
  dataSource: {},
  default: {
    ...initDbConfig,
  },
}


export const kmoreMiddlewareConfig: Readonly<Omit<MiddlewareConfig, 'match'>> = {
  ...initialMiddlewareConfig,
  ignore: [],
  options: {
    ...initMiddlewareOptions,
  },
}

