/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { Span } from '@mwcp/otel'
import {
  CaseConvertTable,
  CaseType,
  DbScopedColsByKey,
  DbScopedColsByTableType,
  JoinTableWithCaseConvert,
  SplitScopedColumn,
  StrKey,
  UnwrapArrayMember,
} from '@waiting/shared-types'
import { DbDict } from 'kmore-types'
import type { Knex } from 'knex'


export { CaseType }

export type KnexConfig = Knex.Config
export type KmoreTransaction = Knex.Transaction & {
  kmoreTrxId: symbol,
  /**
   * Auto transction action (rollback|commit|none) on error (Rejection or Exception),
   * @CAUTION **Will always rollback if query error inner database even though this value set to 'commit'**
   * @default rollback
   */
  trxActionOnEnd: NonNullable<KmoreTransactionConfig['trxActionOnEnd']>,
}
export type KmoreTransactionConfig = Knex.TransactionConfig & {
  /**
   * Atuo trsaction action (rollback|commit|none) on error (Rejection or Exception),
   * @CAUTION **Will always rollback if query error inner database even though this value set to 'commit'**
   * @default rollback
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

export type DbQueryBuilder<
  Context,
  D,
  Prefix extends string,
  CaseConvert extends CaseType
> = {
  /** ref_tb_name: () => knex('tb_name') */
  [tb in keyof D as `${Prefix}${tb & string}`]:
  // @ts-expect-error
  TbQueryBuilder<D, CaseConvert, CaseConvertTable<D[tb], CaseConvert>, Context>
}

export interface BuilderInput {
  ctx?: unknown
  caseConvert?: CaseType | undefined
}

export type TbQueryBuilder<D extends {}, CaseConvert extends CaseType, TRecord extends {}, Context>
  = (ctx?: Context) => KmoreQueryBuilder<D, CaseConvert, TRecord, TRecord[]>

export type KmoreQueryBuilder<
  D extends {} = {}, CaseConvert extends CaseType = CaseType, TRecord extends {} = any, TResult = any> =
  Knex.QueryBuilder<TRecord, TResult>
  & QueryBuilderExtMethod<D, CaseConvert, TRecord>
  & QueryBuilderExtName<D>

interface QueryBuilderExtName<D extends {} = {}> {
  kmoreQueryId: symbol
  dbDict: DbDict<D>
  _tablesJoin: string[]
}

interface QueryBuilderExtMethod<D extends {}, CaseConvert extends CaseType, TRecord extends {} = any> {
  smartCrossJoin: SmartJoin<D, CaseConvert, TRecord>
  smartInnerJoin: SmartJoin<D, CaseConvert, TRecord>
  smartJoin: SmartJoin<D, CaseConvert, TRecord>
  smartLeftJoin: SmartJoin<D, CaseConvert, TRecord>
  smartRightJoin: SmartJoin<D, CaseConvert, TRecord>
}

type SmartJoin<D extends {}, CaseConvert extends CaseType, TResult = unknown[]> = <
  TRecord1 = UnwrapArrayMember<TResult>,
  C2 extends DbScopedColsByKey<D> = DbScopedColsByKey<D>,
  C1 extends DbScopedColsByKey<D> = DbScopedColsByTableType<D, TRecord1>,
  TTable2 extends StrKey<D> = SplitScopedColumn<D, C2>[0],
  TRecord2 extends D[TTable2] = D[TTable2],
  // @ts-expect-error
  TResult2 = JoinTableWithCaseConvert<TRecord1, TRecord2 extends any ? D[TTable2] : TRecord2, TTable2, CaseConvert>,
>(
  /**
   * scoped column name, e.g. 'tb_name.col_name',
   * <tb_name> is the table name be joined, <col_name> is the column name
   */
  scopedColumnBeJoined: C2,
  /**
   * scoped column name, e.g. 'tb_name.col_name',
   * <tb_name> is the upstream table name , <col_name> is the column name
   */
  scopedColumn: C1 extends C2 ? never : C1,
  // @ts-expect-error
) => KmoreQueryBuilder<D, CaseConvert, TResult2, TResult2[]>



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
  queryBuilder: Knex.QueryBuilder | undefined // when event is 'start
  timestamp: number
}

export interface QueryContext {
  wrapIdentifierCaseConvert: CaseType
  postProcessResponseCaseConvert: CaseType
  kmoreQueryId: symbol
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
  timestamp: number
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
}
// export type EventCallbacks<Ctx = any> = Partial<Record<EventCallbackType, EventCallback<Ctx>>>


