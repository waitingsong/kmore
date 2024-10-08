/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ScopeType } from '@mwcp/share'
import type {
  CaseConvertTable,
  CaseType,
  DbScopedColsByKey,
  DbScopedColsByTableType,
  JoinTableWithCaseConvert,
  SplitScopedColumn,
  StrKey,
  UnwrapArrayMember,
} from '@waiting/shared-types'
import type { DbDict } from 'kmore-types'
import type { Knex } from 'knex'

import type { RowLockLevel, TrxPropagateOptions } from '../trx.types.js'


export type DbQueryBuilder<
  D extends object,
  Prefix extends string,
  CaseConvert extends CaseType,
> = {
  /** prefix_tb_name: () => knex('tb_name') */
  [tb in keyof D as `${Prefix}${tb & string}`]: D[tb] extends object
    ? TbQueryBuilder<D, CaseConvert, CaseConvertTable<D[tb], CaseConvert>>
    : never
}


export type TbQueryBuilder<D extends object, CaseConvert extends CaseType, TRecord extends object>
  = () => KmoreQueryBuilder<D, CaseConvert, TRecord, TRecord[]>


export type KmoreQueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any,
  TResult = any[],
> = QueryBuilder<D, CaseConvert, TRecord, TResult>


// export interface TbQueryBuilderOptions<Context> {
//   ctx: Context
// }


export enum QueryBuilderExtKey {
  caseConvert = 'caseConvert',
  kmoreQueryId = 'kmoreQueryId',
  dbDict = 'dbDict',
  dbId = 'dbId',
  tablesJoin = '_tablesJoin',
  pagingType = 'pagingType',
  pagingGroupKey = 'pagingGroupKey',
  transactionalProcessed = 'transactionalProcessed',
  trxPropagateOptions = 'trxPropagateOptions',
  trxPropagated = 'trxPropagated',
  rowLockLevel = 'rowLockLevel',
  callerKey = 'callerKey',
  scope = 'scope',
}
export interface QueryBuilderExtName<D extends object = object> {
  caseConvert: CaseType
  kmoreQueryId: symbol
  dbDict: DbDict<D>
  dbId: string
  _tablesJoin: string[]
  callerKey: string | undefined
  pagingType?: 'counter' | 'pager'
  pagingGroupKey?: symbol
  trxPropagateOptions?: TrxPropagateOptions
  trxPropagated?: boolean
  /**
   * Propagation rowlock level
   * @default {@link RowLockLevel}
   */
  rowLockLevel: RowLockLevel | undefined
  transactionalProcessed: boolean | undefined
  /**
   * Used for transaction operation, e.g. trx.commit()
   * @default kmoreQueryId
   */
  scope: ScopeType | undefined
}


export type SmartJoin<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TResult = unknown[],
> = <
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


export interface QueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any,
  TResult = unknown[],
> extends
  // Knex.QueryInterface<TRecord, TResult>,
  // Knex.QueryBuilder<TRecord, TResult>
  Knex.ChainableInterface<TResult>,
  QueryBuilderExtName<D>,
  Knex.QueryInterface<TRecord, TResult, D, CaseConvert> {

  // methods of knex.QueryBuilder need to be redefined here

  or: QueryBuilder<D, CaseConvert, TRecord, TResult>
  not: QueryBuilder<D, CaseConvert, TRecord, TResult>
  and: QueryBuilder<D, CaseConvert, TRecord, TResult>

  forUpdate(...tableNames: string[]): QueryBuilder<D, CaseConvert, TRecord, TResult>
  forUpdate(tableNames: readonly string[]): QueryBuilder<D, CaseConvert, TRecord, TResult>

  forShare(...tableNames: string[]): QueryBuilder<D, CaseConvert, TRecord, TResult>
  forShare(tableNames: readonly string[]): QueryBuilder<D, CaseConvert, TRecord, TResult>

  forNoKeyUpdate(...tableNames: string[]): QueryBuilder<D, CaseConvert, TRecord, TResult>
  forNoKeyUpdate(
    tableNames: readonly string[]
  ): QueryBuilder<D, CaseConvert, TRecord, TResult>

  forKeyShare(...tableNames: string[]): QueryBuilder<D, CaseConvert, TRecord, TResult>
  forKeyShare(tableNames: readonly string[]): QueryBuilder<D, CaseConvert, TRecord, TResult>

  skipLocked(): QueryBuilder<D, CaseConvert, TRecord, TResult>
  noWait(): QueryBuilder<D, CaseConvert, TRecord, TResult>

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  on(event: string, callback: Function): QueryBuilder<D, CaseConvert, TRecord, TResult>

  queryContext(context: any): QueryBuilder<D, CaseConvert, TRecord, TResult>

  clone(): QueryBuilder<D, CaseConvert, TRecord, TResult>
  timeout(
    ms: number,
    options?: { cancel?: boolean }
  ): QueryBuilder<D, CaseConvert, TRecord, TResult>

}

