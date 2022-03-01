import { Config } from './types'


export const enum ConfigKey {
  config = 'kmoreConfig',
  middlewareConfig = 'kmoreMiddlewareConfig',
  namespace = 'kmore',
  componentName = 'kmoreComponent',
  middlewareName = 'kmoreMiddleware'
}

export const initialConfig: Readonly<Config> = {
  defaultMaxListeners: 200,
  timeoutWhenDestroy: 2000,
}

