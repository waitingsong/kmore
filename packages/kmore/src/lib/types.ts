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

export type TbQueryBuilder<TRecord> = () => Knex.QueryBuilder<TRecord, TRecord[]>

// export type QueryBuilderExt<TRecord, TResult = TRecord[]>
//  = Knex.QueryBuilder<TRecord, TResult>
// export type TbQueryBuilder<TRecord>
//   = <KeyExcludeOptional extends keyof TRecord | void = void>
//   () => KeyExcludeOptional extends void
//     ? QueryBuilderExt<TRecord>
//     : QueryBuilderExt<Omit<TRecord, KeyExcludeOptional extends void ? never : KeyExcludeOptional>>


export interface OnQueryArgData {
  __knexUid: string
  __knexTxId: undefined | string
  method: string // 'select'
  options: Record<string, unknown>
  timeout: boolean
  cancelOnTimeout: boolean
  bindings: unknown[]
  __knexQueryUid: string // 'mXxtvuJLHkZI816UZic57'
  sql: string
}

export interface OnQueryErrorArgData {
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

export interface OnQueryErrorArgErr {
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
