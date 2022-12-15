import { ConfigKey, KmoreSourceConfig, MiddlewareConfig } from './lib/types'


export { AutoConfiguration as Configuration } from './configuration'
export * from './lib/index'
export * from './middleware/db-trx.middleware'
export * from './decorator/index.decorator'


export {
  getCurrentTime,
  Kmore,
  KmoreEvent,
  KmoreTransaction,
  KmoreTransactionConfig,
  KnexConfig,
  mergeDoWithInitData,
  PageRawType,
  PageWrapType,
  PagingMeta,
  PagingOptions,
  PropagationType,
  RowLockLevel,
  TrxPropagateOptions,
} from 'kmore'

export type { Knex } from 'knex'


declare module '@midwayjs/core/dist/interface' {
  interface MidwayConfig {
    [ConfigKey.config]: KmoreSourceConfig
    [ConfigKey.middlewareConfig]: MiddlewareConfig
  }
}

