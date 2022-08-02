import {
  Config,
  MiddlewareConfig,
  MiddlewareOptions,
} from './types'


export const initialConfig: Readonly<Config> = {
  timeoutWhenDestroy: 10000,
}

export const initMiddlewareOptions: MiddlewareOptions = {
  debug: false,
}
export const initialMiddlewareConfig: Readonly<Omit<MiddlewareConfig, 'ignore' | 'match' | 'options'>> = {
  enableMiddleware: true,
}

export enum ConfigKey {
  config = 'kmoreConfig',
  middlewareConfig = 'kmoreMiddlewareConfig',
  dataSourceConfig = 'kmoreDataSourceConfig',
  namespace = 'kmore',
  componentName = 'kmoreComponent',
  middlewareName = 'kmoreMiddleware'
}

