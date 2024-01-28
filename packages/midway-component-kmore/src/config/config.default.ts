import {
  initDbConfig,
  initialMiddlewareConfig,
  initMiddlewareOptions,
  initPropagationConfig,
} from '##/lib/config.js'
import {
  KmorePropagationConfig,
  Config,
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

