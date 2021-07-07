import { KnexConfig } from 'kmore'
import type { DbDict } from 'kmore-types'
import { Knex } from 'knex'
import { Span } from 'opentracing'

import { Context } from '~/interface'


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
   * Tracing query response (respRaw.response),
   * @default true
   * @description tracing if true of if query cost > sampleThrottleMs
   */
  tracingResponse: boolean
  /**
   * 强制采样请求处理时间（毫秒）阈值
   * 负数不采样
   */
  sampleThrottleMs: number
}

export interface KmoreComponentFactoryOpts<D> {
  ctx: Context
  dbConfig: DbConfig<D>
  dbh?: Knex
  dbId?: string
  instanceId?: string | symbol
}

export interface QuerySpanInfo {
  span: Span
  tagClass: string
  timestamp: number
}
