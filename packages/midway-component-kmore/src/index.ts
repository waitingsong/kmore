import type { ConfigKey, KmoreSourceConfig, MiddlewareConfig } from './lib/types.js'


export { AutoConfiguration as Configuration } from './configuration.js'
export * from './app/index.controller.js'
export * from './lib/index.js'
export * from './middleware/index.middleware.js'
export * from './decorator/index.decorator.js'


export {
  type KmoreEvent,
  type KmoreQueryBuilder,
  type KmoreTransaction,
  type KmoreTransactionConfig,
  type KnexConfig,
  type PageRawType,
  type PageWrapType,
  type PagingMeta,
  type PagingOptions,
  type TrxPropagateOptions,
  CaseType,
  Kmore,
  PropagationType,
  RowLockLevel,
  getCurrentTime,
  mergeDoWithInitData,
} from 'kmore'

export type { Knex } from 'knex'

export type {
  JsonObject,
  JsonResp,
  JsonType,
  MiddlewareConfig,
  NpmPkg,
} from '@waiting/shared-types'


// @ts-ignore
declare module '@midwayjs/core/dist/interface' {
  interface MidwayConfig {
    [ConfigKey.config]?: KmoreSourceConfig
    [ConfigKey.middlewareConfig]?: MiddlewareConfig
  }
}

