/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import { RecordCamelKeys, RecordPascalKeys, RecordSnakeKeys } from '@waiting/shared-types'
import type { Knex } from 'knex'
import { Span } from 'opentracing'


export type KnexConfig = Knex.Config

export enum EnumClient {
  pg = 'pg',
  mssql = 'mssql',
  mysql = 'mysql',
  mysql2 = 'mysql2',
  sqlite3 = 'sqlite3',
  oracledb = 'oracledb',
}

export enum CaseType {
  camel = 'camel',
  pascal = 'pascal',
  snake = 'snake',
  none = 'none'
}

export type DbQueryBuilder<
  Context,
  D,
  Prefix extends string,
  CaseConvert extends CaseType
> = {
  /** ref_tb_name: () => knex('tb_name') */
  // [tb in keyof D as `${Prefix}${tb & string}`]: TbQueryBuilder<D[tb]>
  [tb in keyof D as `${Prefix}${tb & string}`]: CaseConvert extends CaseType.camel
    ? TbQueryBuilder<RecordCamelKeys<D[tb]>, Context>
    : CaseConvert extends CaseType.snake
      ? TbQueryBuilder<RecordSnakeKeys<D[tb]>, Context>
      : CaseConvert extends CaseType.pascal
        ? TbQueryBuilder<RecordPascalKeys<D[tb]>, Context>
        : TbQueryBuilder<D[tb], Context>
}

export interface BuilderInput {
  ctx?: unknown
  caseConvert?: CaseType | undefined
}

export type TbQueryBuilder<TRecord, Context> = (ctx?: Context) => Knex.QueryBuilder<TRecord, TRecord[]>
// export type TbQueryBuilder<TRecord>
//   = <CaseConvert extends CaseType = CaseType.none>(caseConvert?: CaseConvert)
//   => CaseConvert extends CaseType.camel
//     ? Knex.QueryBuilder<RecordCamelKeys<TRecord>, TRecord[]>
//     : CaseConvert extends CaseType.snake
//       ? Knex.QueryBuilder<RecordSnakeKeys<TRecord>, TRecord[]>
//       : CaseConvert extends CaseType.pascal
//         ? Knex.QueryBuilder<RecordPascalKeys<TRecord>, TRecord[]>
//         : Knex.QueryBuilder<TRecord, TRecord[]>


// export type QueryBuilderExt<TRecord, TResult = TRecord[]>
//  = Knex.QueryBuilder<TRecord, TResult>
// export type TbQueryBuilder<TRecord>
//   = <KeyExcludeOptional extends keyof TRecord | void = void>
//   () => KeyExcludeOptional extends void
//     ? QueryBuilderExt<TRecord>
//     : QueryBuilderExt<Omit<TRecord, KeyExcludeOptional extends void ? never : KeyExcludeOptional>>

export type EventType = 'query' | 'queryError' | 'queryResponse' | 'start' | 'unknown'

export interface KmoreEvent <T = unknown> {
  dbId: string
  type: EventType
  /** passed from external */
  identifier: unknown
  /** __knexUid */
  kUid: string
  /** __knexQueryUid */
  queryUid: string // 'mXxtvuJLHkZI816UZic57'
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
  queryBuilder: Knex.QueryBuilder | undefined // when event is 'start
  timestamp: number
}

export interface QueryContext {
  wrapIdentifierCaseConvert: CaseType
  postProcessResponseCaseConvert: CaseType
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
  _parsers: unknown[] | unknown
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
  tagClass: string
  timestamp: number
}

export interface EventCallbackOptions<Ctx = unknown, R = unknown> {
  ctx: Ctx
  event?: KmoreEvent<R>
}
/**
 * @docs https://knexjs.org/guide/interfaces.html#query-response
 */
export type EventCallback<Ctx = any> = (event: KmoreEvent, ctx?: Ctx) => Promise<void>
/**
 * @docs https://knexjs.org/guide/interfaces.html#query-response
 */
export type EventCallbackType = Exclude<EventType, 'unknown'>
/**
 * @docs https://knexjs.org/guide/interfaces.html#query-response
 */
export type EventCallbacks<Ctx = any> = Partial<Record<EventCallbackType, EventCallback<Ctx>>>

