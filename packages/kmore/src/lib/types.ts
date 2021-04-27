/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
// import { FullTableModelFromDictAlias } from '@waiting/shared-types'
import { Knex } from 'knex'


export type KnexConfig = Knex.Config

export enum EnumClient {
  pg = 'pg',
  mssql = 'mssql',
  mysql = 'mysql',
  mysql2 = 'mysql2',
  sqlite3 = 'sqlite3',
  oracledb = 'oracledb',
}

export type DbQueryBuilder<D, Prefix extends string = 'ref_'> = {
  /** ref_tb_name: () => knex('tb_name') */
  [tb in keyof D as `${Prefix}${tb & string}`]: TbQueryBuilder<D[tb]>
}

export type TbQueryBuilder<TRecord> = (identifier?: unknown) => Knex.QueryBuilder<TRecord, TRecord[]>

// export type QueryBuilderExt<TRecord, TResult = TRecord[]>
//  = Knex.QueryBuilder<TRecord, TResult>
// export type TbQueryBuilder<TRecord>
//   = <KeyExcludeOptional extends keyof TRecord | void = void>
//   () => KeyExcludeOptional extends void
//     ? QueryBuilderExt<TRecord>
//     : QueryBuilderExt<Omit<TRecord, KeyExcludeOptional extends void ? never : KeyExcludeOptional>>

export interface KmoreEvent <T = unknown> {
  type: 'query' | 'queryError' | 'queryResponse' | 'unknown'
  identifier: unknown
  queryUid: string // 'mXxtvuJLHkZI816UZic57'
  data: OnQueryCbData | undefined
  respData: unknown[]
  respRawData: OnQueryRespCbRawData<T> | undefined
  exData: OnQueryErrorCbData | undefined
  exError: OnQueryErrorCbErr | undefined
}

export interface OnQueryCbData {
  __knexUid: string // "__knexUid3"
  __knexTxId: undefined | string // "trx2"
  method: string // 'select', 'raw'
  options: Record<string, unknown>
  timeout: boolean
  cancelOnTimeout: boolean
  bindings: unknown[]
  __knexQueryUid: string // 'mXxtvuJLHkZI816UZic57'
  sql: string
}

export interface OnQueryRespCbRawData <T = unknown> {
  __knexUid: string // '__knexUid3'
  __knexTxId: string | undefined // 'trx2'
  method: string // 'select'
  options: Record<string, unknown>
  timeout: boolean
  cancelOnTimeout: boolean
  bindings: unknown[]
  __knexQueryUid: string // 'vFFCb1Utd8Aosbumkfm_v'
  sql: string // 'select * from "tb_user" where "uid" = $1 for update'
  queryContext: unknown
  response: RawResponse<T>
}
export interface RawResponse <T = unknown> {
  command: string // 'SELECT'
  rowCount: number | null // 1
  oid?: unknown
  rows: Record<string, T>[]
  fields: Record<string, string | number>[]
  _parsers: unknown[] | unknown
  _types: unknown
  RowCtor: unknown
  rowAsArray: boolean
}

export interface OnQueryErrorCbData {
  __knexUid: string // "__knexUid2"
  __knexTxId: undefined | string
  queryContext: unknown
  method: string
  options: Record<string, unknown>
  timeout: boolean
  cancelOnTimeout: boolean
  bindings: unknown[]
  __knexQueryUid: string // 'rhS1Gw1-uA79HFgn1Ob9g'
  sql: string // 'select "*x" from "tb_user"'
}

export interface OnQueryErrorCbErr {
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

