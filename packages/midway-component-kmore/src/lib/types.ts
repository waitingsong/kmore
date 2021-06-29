import { Logger, TracerManager } from '@mw-components/jaeger'
import { DbDict, KnexConfig } from 'kmore'
import { Knex } from 'knex'
import { Span } from 'opentracing'


export interface KmoreComponentConfig <DbId extends string = string> {
  dbConfigs: DbConfigs<DbId>
  /**
   * @default 100
   * @see https://nodejs.org/dist/latest-v16.x/docs/api/events.html#events_emitter_getmaxlisteners
   */
  defaultMaxListeners?: number
  /**
   * @default 2000
   */
  timeoutWhenDestroy?: number
}

export type DbConfigs <DbId extends string = string> = Record<DbId, DbConfig>
export interface DbConfig <T = unknown> {
  /**
   * Auto connect when service onReady
   * @default true
   */
  autoConnect: boolean
  config: KnexConfig
  dict: DbDict<T>
  /**
   * Enable tracing via @mw-components/jaeger
   * @default false
   */
  enableTracing: boolean
  /**
   * 强制采样请求处理时间（毫秒）阈值
   * 负数不采样
   */
  sampleThrottleMs: number
}

export interface KmoreComponentFactoryOpts<D> {
  dbConfig: DbConfig<D>
  dbh?: Knex
  dbId?: string
  instanceId?: string | symbol
  logger?: Logger
  trm?: TracerManager
}

export interface QuerySpanInfo {
  span: Span
  tagClass: string
  timestamp: number
}
