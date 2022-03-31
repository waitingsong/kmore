import {
  Config,
  MiddlewareConfig,
  MiddlewareOptions,
} from './types'


export const initialConfig: Readonly<Config> = {
  defaultMaxListeners: 200,
  timeoutWhenDestroy: 2000,
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
  namespace = 'kmore',
  componentName = 'kmoreComponent',
  middlewareName = 'kmoreMiddleware'
}

