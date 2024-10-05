import {
  initDbConfig,
  initMiddlewareOptions,
  initPropagationConfig,
  initialMiddlewareConfig,
} from '##/lib/config.js'
import type {
  Config,
  KmorePropagationConfig,
  MiddlewareConfig,
} from '##/lib/index.js'


export const kmoreConfig: Config = {
  enableDefaultRoute: false,
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


export const kmorePropagationConfig: KmorePropagationConfig = {
  ...initPropagationConfig,
}

