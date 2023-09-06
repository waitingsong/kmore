/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { TraceContext, Span } from '@mwcp/otel'
import { CaseType } from '@waiting/shared-types'
import type { Knex } from 'knex'

import {
  KmoreQueryBuilder,
  QueryBuilderExtKey,
  TrxPropagateOptions,
} from './builder.types.js'


export { CaseType }

export type KnexConfig = Knex.Config
export type KmoreTransaction = Knex.Transaction & {
  dbId: string,
  hrtime: bigint,
  kmoreTrxId: symbol,
  /**
   * Auto transction action (rollback|commit|none) on builder error (Rejection or Exception),
   * declarative transaction always rollback on end
   *
   * @default rollback
   * @note Error from ONLY builder can be catched, from then() on builder not processed!
   * @CAUTION **Will always rollback if query error inner database even though this value set to 'commit'**
   */
  trxActionOnEnd: NonNullable<KmoreTransactionConfig['trxActionOnEnd']>,

  [QueryBuilderExtKey.trxPropagateOptions]?: TrxPropagateOptions,

  savepoint: (
    id?: PropertyKey,
    config?: KmoreTransactionConfig,
  ) => Promise<KmoreTransaction>,
}
export type KmoreTransactionConfig = Knex.TransactionConfig & {
  kmoreTrxId?: PropertyKey | undefined,
  /**
   * Auto transction action (rollback|commit|none) on builder error (Rejection or Exception),
   * declarative transaction always rollback on end
   *
   * @default rollback
   * @note Error from ONLY builder can be catched, from then() on builder not processed!
   * @CAUTION **Will always rollback if query error inner database even though this value set to 'commit'**
   */
  trxActionOnEnd?: 'commit' | 'rollback' | 'none',
}
export enum EnumClient {
  betterSqlite3 = 'better-sqlite3',
  cockroachdb = 'cockroachdb',
  mssql = 'mssql',
  mysql = 'mysql',
  mysql2 = 'mysql2',
  pg = 'pg',
  pgnative = 'pgnative',
  oracledb = 'oracledb',
  redshift = 'redshift',
  sqlite3 = 'sqlite3',
}

export enum SmartKey {
  join = 'smartJoin',
  leftJoin = 'smartLeftJoin',
  rightJoin = 'smartRightJoin',
  innerJoin = 'smartInnerJoin',
  crossJoin = 'smartCrossJoin',
}


export type EventType = 'query' | 'queryError' | 'queryResponse' | 'start' | 'unknown'

export interface KmoreEvent <T = unknown> {
  dbId: string
  type: EventType
  /** __knexUid */
  kUid: string
  /** __knexQueryUid */
  queryUid: string // 'mXxtvuJLHkZI816UZic57'
  kmoreQueryId: symbol
  /**
   * @description Note: may keep value of the latest transaction id,
   * even if no transaction this query!
   * __knexTxId
   *
   */
  trxId: string | undefined
  /** select, raw */
  method: string
  /** SELECT, DROP */
  command: string | undefined
  data: OnQueryData | undefined
  respRaw: OnQueryRespRaw<T> | undefined
  exData: OnQueryErrorData | undefined
  exError: OnQueryErrorErr | undefined
  queryBuilder: KmoreQueryBuilder | undefined // when event is 'start
  timestamp: number
}

export interface QueryContext {
  wrapIdentifierCaseConvert: CaseType
  postProcessResponseCaseConvert: CaseType
  kmoreQueryId: symbol
  columns: Record<string, string>[]
}

export interface OnQueryData {
  __knexUid: string // "__knexUid3"
  /**
   * @description Note: may keep value of the latest transaction id,
   * even if no transaction this query!
   * __knexTxId
   *
   */
  __knexTxId: undefined | string // "trx2"
  __knexQueryUid?: string // 'mXxtvuJLHkZI816UZic57'
  bindings: unknown[] | undefined
  cancelOnTimeout?: boolean
  method?: string // 'select', 'raw'
  options?: Record<string, unknown>
  sql: string // 'select *....', 'COMMIT;'
  timeout?: boolean
}

export interface OnQueryRespRaw <T = unknown> {
  __knexUid: string // '__knexUid3'
  __knexTxId: string | undefined // 'trx2'
  __knexQueryUid?: string // 'vFFCb1Utd8Aosbumkfm_v'
  bindings: unknown[] | undefined
  cancelOnTimeout?: boolean
  method?: string // 'select', 'raw'
  options?: Record<string, unknown>
  queryContext: unknown
  response?: QueryResponse<T>
  returning?: string
  sql: string // 'select * from "tb_user" where "uid" = $1 for update'
  timeout?: boolean
}
export interface QueryResponse <T = unknown> {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  _parsers: unknown[] | any
  _types: unknown
  command: string // 'SELECT', 'DROP'
  fields: Record<string, string | number>[]
  oid?: unknown
  rowAsArray: boolean
  rowCount: number | null // 1
  RowCtor: unknown
  rows: Record<string, T>[]
}

export interface OnQueryErrorData {
  __knexUid: string // "__knexUid2"
  __knexTxId: undefined | string
  __knexQueryUid: string | undefined // 'rhS1Gw1-uA79HFgn1Ob9g'
  bindings: unknown[]
  cancelOnTimeout: boolean
  method: string
  options: Record<string, unknown>
  queryContext: unknown
  sql: string // 'select "*x" from "tb_user"'
  timeout: boolean
}

export interface OnQueryErrorErr {
  code: string // '42703'
  column: unknown
  constraint: unknown
  dataType: unknown
  detail: unknown
  file: string // 'parse_relation.c'
  hint: unknown
  internalPosition: unknown
  internalQuery: unknown
  length: number
  line: string // '3514'
  message?: string
  name: 'error'
  position: string // '8'
  routine: string // 'errorMissingColumn'
  schema: unknown
  severity: string // 'ERROR'
  stack?: string
  table: unknown
  where: unknown
}


export interface QuerySpanInfo {
  span: Span
  timestamp: number
  traceContext?: TraceContext
}

export interface EventCallbackOptions<Ctx = unknown, R = unknown> {
  ctx: Ctx
  event?: KmoreEvent<R>
}
/**
 * @docs https://knexjs.org/guide/interfaces.html#query-response
 */
// export type EventCallback<Ctx = any> = (event: KmoreEvent, ctx?: Ctx) => Promise<void>


/**
 * @docs https://knexjs.org/guide/interfaces.html#query-response
 */
export type EventCallbackType = Exclude<EventType, 'unknown'>
/**
 * @docs https://knexjs.org/guide/interfaces.html#query-response
 */
export type EventCallbacks<Ctx = any> = Partial<EventCallbackList<Ctx>>
export interface EventCallbackList<Ctx = any> {
  start: (event: KmoreEvent, ctx?: Ctx) => void
  query: (event: KmoreEvent, ctx?: Ctx) => void
  queryResponse: (event: KmoreEvent, ctx?: Ctx) => void
  queryError: (event: KmoreEvent, ctx?: Ctx) => Promise<void>
  /**
   * Fire a single "end" event on the builder when
   * all queries have successfully completed.
   */
  // end: () => void
  /**
   * Triggered after event 'queryError'
   */
  // error: (ex: Error) => void
}
// export type EventCallbacks<Ctx = any> = Partial<Record<EventCallbackType, EventCallback<Ctx>>>


export enum KmorePageKey {
  AutoPaging = 'autoPaging',
  PagingOptions = '_pagingOptions',
  PagingProcessed = '_pagingProcessed',
  /**
   * @value 'counter' | 'pager'
   */
  PagingBuilderType = 'pagingType',
}
export enum KmoreProxyKey {
  getThenProxy = 'KmoreGetThenProxy',
  getThenProxyProcessed = 'KmoreGetThenProxyProcessed',
}


/**
 * kmoreTrxId => Set<kmoreQueryId>
 */
export type TrxIdQueryMap = Map<symbol, Set<symbol>>

export type TrxSavePointCallback = (trx: KmoreTransaction) => Promise<unknown>


export interface BuilderInput {
  ctx?: unknown
  caseConvert?: CaseType | undefined
}

