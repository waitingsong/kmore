import type { MiddlewareConfig as MWConfig } from '@waiting/shared-types'
import type { KmoreFactoryOpts } from 'kmore'
import type { Span } from 'opentracing'


/**
 * KmoreComponentConfig
 */
export interface Config {
  /**
   * @default 10_000
   */
  timeoutWhenDestroy?: number
}

export interface MiddlewareOptions {
  debug: boolean
}
export type MiddlewareConfig = MWConfig<MiddlewareOptions>

/** midway DataSource */
export interface DataSourceConfig<SourceName extends string = string> {
  dataSource: DataSource<SourceName>
  default?: DbConfig<'default'>
}
export type DataSource<SourceName extends string = string> = Record<SourceName, DbConfig>
export interface DbConfig<T = any, Ctx = any> extends KmoreFactoryOpts<T, Ctx> {
  /**
   * Enable tracing via @mw-components/jaeger
   * @default false
   */
  enableTracing?: boolean
  /**
   * Tracing query response (respRaw.response),
   * @default true
   * @description tracing if true of if query cost > sampleThrottleMs
   */
  tracingResponse?: boolean
  /**
   * 强制采样请求处理时间（毫秒）阈值
   * 负数不采样
   * @default 3000
   */
  sampleThrottleMs?: number
}

export interface QuerySpanInfo {
  span: Span
  tagClass: string
  timestamp: number
}

