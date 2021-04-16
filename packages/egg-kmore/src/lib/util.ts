import assert from 'assert'

import {
  initialEggConfig,
  initialClientOptions,
} from './config'
import {
  KmoreEggConfig,
  ClientOptions,
} from './types'


/** Generate Config with input and default value */
export function parseConfig(input: KmoreEggConfig): KmoreEggConfig {
  const config = {
    client: parseOptions(input.client),
  } as KmoreEggConfig

  config.appWork = typeof input.appWork === 'boolean'
    ? input.appWork
    : initialEggConfig ? !! initialEggConfig.appWork : true

  config.agent = typeof input.agent === 'boolean'
    ? input.agent
    : initialEggConfig ? !! initialEggConfig.agent : false


  /* istanbul ignore else */
  // if (typeof input.enable === 'boolean') {
  //   config.enable = input.enable
  // }

  /* istanbul ignore else */
  // if (typeof input.ignore !== 'undefined') {
  //   config.ignore = input.ignore
  // }

  /* istanbul ignore else */
  // if (typeof input.match !== 'undefined') {
  //   config.match = input.match
  // }

  // config.appMiddlewareIndex = typeof input.appMiddlewareIndex === 'number'
  //   ? input.appMiddlewareIndex
  //   : initialConfig.appMiddlewareIndex

  return config
}

/** Generate Options with input and default value */
export function parseOptions(client?: ClientOptions): ClientOptions {
  const opts = {
    ...initialClientOptions,
    ...client,
  }

  assert(opts)
  return opts
}

