import {
  DbConfig,
  MiddlewareConfig,
  MiddlewareOptions,
} from './types'


// export const initialConfig: Readonly<KmoreSourceConfig> = {
//   timeoutWhenDestroy: 10000,
// }

export const initMiddlewareOptions: MiddlewareOptions = {
  debug: false,
}
export const initialMiddlewareConfig: Readonly<Omit<MiddlewareConfig, 'ignore' | 'match' | 'options'>> = {
  enableMiddleware: true,
}


export const initDbConfig: DbConfig = {
  config: {},
  sampleThrottleMs: 3000,
  enableTracing: true,
  tracingResponse: true,
}

