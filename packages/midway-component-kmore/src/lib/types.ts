/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MiddlewareConfig as MWConfig } from '@waiting/shared-types'
import type { KmoreFactoryOpts, PropagationType, RowLockLevel } from 'kmore'


export type { QuerySpanInfo } from 'kmore'


export enum ConfigKey {
  config = 'kmoreConfig',
  middlewareConfig = 'kmoreMiddlewareConfig',
  namespace = 'kmore',
  componentName = 'kmoreComponent',
  middlewareName = 'kmoreMiddleware',
  dbSourceManager = 'DbSourceManager',
  dbManager = 'DbManager',
  propagationConfig = 'kmorePropagationConfig',
}

export enum Msg {
  insufficientCallstacks = 'Insufficient call stacks by getCallerStack',
  callerKeyNotRegisteredOrNotEntry = 'callerKey is not registered or not entry caller',
}

/**
 * KmoreComponentConfig
 */
// export interface Config {
//   /**
//    * @default 10_000
//    */
//   timeoutWhenDestroy?: number
// }

export interface MiddlewareOptions {
  debug: boolean
}
export type MiddlewareConfig = MWConfig<MiddlewareOptions>

/** midway DataSource */
export interface KmoreSourceConfig<SourceName extends string = string> {
  dataSource: DataSource<SourceName>
  default?: DbConfig
}
export type DataSource<SourceName extends string = string> = Record<SourceName, DbConfig>
export interface DbConfig<T = any, Ctx = any> extends KmoreFactoryOpts<T, Ctx> {
  /**
   * Enable open telemetry via @mwcp/otel
   * @default true
   */
  enableTrace?: boolean
  /**
   * Whether add event on span
   * @default true
   */
  traceEvent?: boolean
  /**
   * Tracing query response (respRaw.response),
   * @default true
   * @description tracing if true of if query cost > sampleThrottleMs
   */
  traceResponse?: boolean
  /**
   * 强制采样请求处理时间（毫秒）阈值
   * 负数不采样
   * @default 3000
   */
  sampleThrottleMs?: number
}

export enum KmoreAttrNames {
  QueryBuilderStart = 'query.builder.start',

  TrxBegin = 'trx.begin',
  TrxBeginStart = 'trx.begin.start',
  TrxBeginEnd = 'trx.begin.end',

  TrxCommit = 'trx.commit',
  TrxCommitStart = 'trx.commit.start',
  TrxCommitEnd = 'trx.commit.end',

  TrxRollback = 'trx.rollback',
  TrxRollbackStart = 'trx.rollback.start',
  TrxRollbackEnd = 'trx.rollback.end',

  TrxTransacting = 'trx.transacting',
  TrxEndWith = 'trx.end',
}


/**
 * Transaction propagation config for declaritive transaction
 */
export interface KmorePropagationConfig extends TransactionalOptions {
  /**
   * @default PropagationType.REQUIRED,
   */
  propagationType: PropagationType
}
export interface TransactionalOptions {
  /**
   * @default {@link RowLockLevel.ForShare}
   */
  readRowLockLevel: RowLockLevel
  /**
   * @default {@link RowLockLevel.ForUpdate}
   */
  writeRowLockLevel: RowLockLevel
}

