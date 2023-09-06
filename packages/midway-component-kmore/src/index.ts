import { ConfigKey, KmoreSourceConfig, MiddlewareConfig } from './lib/types.js'


export { AutoConfiguration as Configuration } from './configuration.js'
export * from './app/index.controller.js'
export * from './lib/index.js'
export * from './middleware/index.middleware.js'
export * from './decorator/index.decorator.js'


export {
  CaseType,
  Kmore,
  KmoreEvent,
  KmoreQueryBuilder,
  KmoreTransaction,
  KmoreTransactionConfig,
  KnexConfig,
  PageRawType,
  PageWrapType,
  PagingMeta,
  PagingOptions,
  PropagationType,
  RowLockLevel,
  TrxPropagateOptions,
  getCurrentTime,
  mergeDoWithInitData,
} from 'kmore'

export type { Knex } from 'knex'


// @ts-ignore
declare module '@midwayjs/core/dist/interface' {
  interface MidwayConfig {
    [ConfigKey.config]?: KmoreSourceConfig
    [ConfigKey.middlewareConfig]?: MiddlewareConfig
  }
}

