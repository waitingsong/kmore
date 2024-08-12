/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { ScopeType } from '@mwcp/share'
import { CaseType } from '@waiting/shared-types'
import type { Knex } from 'knex'

import type { QueryBuilderExtKey } from './builder/builder.types.js'
import type { TrxCommitRollbackHook } from './hook/hook.types.js'
import type { TrxControl, TrxPropagateOptions } from './trx.types.js'


export { CaseType }

export type KnexConfig = Knex.Config
export type KmoreTransaction = Knex.Transaction & {
  dbId: string,
  ctime: Date,
  kmoreTrxId: symbol,
  scope: ScopeType | undefined,
  /**
   * Auto transaction action (rollback|commit|none) on builder error (Rejection or Exception),
   * declarative transaction always rollback on end
   *
   * @default rollback
   * @note Error from ONLY builder can be catch, from then() on builder not processed!
   * @CAUTION **Will always rollback if query error inner database even though this value set to 'commit'**
   */
  trxActionOnError: NonNullable<KmoreTransactionConfig['trxActionOnError']>,

  [QueryBuilderExtKey.trxPropagateOptions]?: TrxPropagateOptions,

  processingHooks: Set<TrxCommitRollbackHook>,

  savepoint: (
    id?: symbol,
    config?: KmoreTransactionConfig,
  ) => Promise<KmoreTransaction>,
}
export type KmoreTransactionConfig = Knex.TransactionConfig & {
  kmoreTrxId?: symbol | undefined,
  /**
   * Auto transition action (rollback|commit|none) on builder error (Rejection or Exception),
   * declarative transaction always rollback on end
   *
   * @default rollback
   * @note Error from ONLY builder can be catch, from then() on builder not processed!
   * @CAUTION **Will always rollback if query error inner database even though this value set to 'commit'**
   */
  trxActionOnError?: TrxControl | 'none',
  scope?: ScopeType | undefined,
  trxPropagateOptions?: TrxPropagateOptions | undefined,
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

export type WrapIdentifierIgnoreRule = (string | RegExp)[]


export type EventType = 'query' | 'queryError' | 'queryResponse' | 'start' | 'unknown'

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

export interface OnQueryRespRaw<T = unknown> {
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
export interface QueryResponse<T = unknown> {
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


export enum KmorePageKey {
  AutoPaging = 'autoPaging',
  PagingOptions = '_pagingOptions',
  PagingProcessed = '_pagingProcessed',
  /**
   * @value 'counter' | 'pager'
   */
  PagingBuilderType = 'pagingType',
  PagingMetaTotal = 'pagingMetaTotal',
}
export enum KmoreProxyKey {
  getThenProxyProcessed = 'KmoreGetThenProxyProcessed',

  then = 'then',
  _ori_then = '_ori_then',

  commit = 'commit',
  _ori_commit = '_ori_commit',

  rollback = 'rollback',
  _ori_rollback = '_ori_rollback',

  savepoint = 'savepoint',
  _ori_savepoint = '_ori_savepoint',

  transacting = 'transacting',
  _ori_transacting = '_ori_transacting',
}
export enum KmoreBuilderType {
  counter = 'counter',
  pager = 'pager',
}


/**
 * Map<trxId, Set<queryId>>
 */
export type TrxIdQueryMap = Map<symbol, Set<symbol>>

export type TrxSavePointCallback = (trx: KmoreTransaction) => Promise<unknown>


// export interface BuilderInput {
//   ctx?: unknown
//   caseConvert?: CaseType | undefined
// }


