/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BaseConfig } from '@mwcp/share'
import type { MiddlewareConfig as MWConfig } from '@waiting/shared-types'
import type { KmoreFactoryOpts, PropagationType, RowLockOptions } from 'kmore'


export type { WrapIdentifierIgnoreRule } from 'kmore'


export enum ConfigKey {
  config = 'kmoreConfig',
  middlewareConfig = 'kmoreMiddlewareConfig',
  namespace = 'kmore',
  componentName = 'kmoreComponent',
  middlewareName = 'kmoreMiddleware',
  dbSourceManager = 'DbSourceManager',
  dbManager = 'DbManager',
  propagationConfig = 'kmorePropagationConfig',
  Transactional = 'Transactional',
}

export enum Msg {
  hello = 'hello world',
  insufficientCallstacks = 'Insufficient call stacks by getCallerStack',
  callerKeyNotRegisteredOrNotEntry = 'callerKey is not registered or not entry caller',
  propagationConfigIsUndefined = 'propagationConfig is undefined',
  registerPropagationFailed = 'registerPropagation() failed',
}


export interface Config<SourceName extends string = string> extends BaseConfig, KmoreSourceConfig<SourceName> { }

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
export interface DbConfig<T = any> extends KmoreFactoryOpts<T> {
  /**
   * Enable open telemetry via @mwcp/otel
   * @default true
   */
  enableTrace?: boolean
  /**
   * Whether add event on span
   * @default all
   */
  traceEvents?: Set<KmoreAttrNames> | 'all'
  /**
   * Tracing database connection (including connection secret!)
   * @default false
   */
  traceInitConnection?: boolean
  /**
   * 强制采样请求处理时间（毫秒）阈值
   * 负数不采样
   * @description NOT used currently
   * @default 3000
   */
  sampleThrottleMs?: number
}


export enum KmoreAttrNames {
  BuilderCompile = 'builder.compile',
  QueryStart = 'query.start',
  QueryQuerying = 'query.querying',
  QueryResponse = 'query.response',
  QueryError = 'query.error',

  // TrxCreate = 'trx.create',
  TrxCreateStart = 'trx.create.start',
  TrxCreateEnd = 'trx.create.end',

  // TrxCommit = 'trx.commit',
  TrxCommitStart = 'trx.commit.start',
  TrxCommitEnd = 'trx.commit.end',

  // TrxRollback = 'trx.rollback',
  TrxRollbackStart = 'trx.rollback.start',
  TrxRollbackEnd = 'trx.rollback.end',

  TrxTransacting = 'trx.transacting',

  // TrxHookPre = 'trx.hook.pre',
  // TrxHookPost = 'trx.hook.post',

  getDataSourceStart = 'getDataSource.start',
  getDataSourceEndFromCache = 'getDataSource.end.fromCache',
  getDataSourceEnd = 'getDataSource.end',
}


/**
 * Transaction propagation config for declarative transaction
 */
export interface KmorePropagationConfig extends RowLockOptions {
  /**
   * @default PropagationType.REQUIRED,
   */
  propagationType: PropagationType
}



export interface ConnectionConfig {
  host: string
  port?: number
  user: string
  password: string
  database: string
  domain?: string
  instanceName?: string
  debug?: boolean
  requestTimeout?: number
}
