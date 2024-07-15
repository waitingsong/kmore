/* eslint-disable @typescript-eslint/unified-signatures */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
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

import type * as DeferredKeySelectionNS from './knex.deferred-key-selection-ns.types.js'
import type { AddPagingMeta, PagingCategory } from './paging.types.js'
import type { RowLockLevel, TrxPropagateOptions } from './trx.types.js'


export type DbQueryBuilder<
  Context,
  D extends object,
  Prefix extends string,
  CaseConvert extends CaseType,
> = {
  /** ref_tb_name: () => knex('tb_name') */
  [tb in keyof D as `${Prefix}${tb & string}`]: D[tb] extends object
    ? TbQueryBuilder<D, CaseConvert, CaseConvertTable<D[tb], CaseConvert>, Context>
    : never
}


export type TbQueryBuilder<D extends object, CaseConvert extends CaseType, TRecord extends object, Context>
  = (options?: Partial<TbQueryBuilderOptions<Context>>) => KmoreQueryBuilder<D, CaseConvert, 0, TRecord, TRecord[]>


export type KmoreQueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = unknown[],
> = QueryBuilder<D, CaseConvert, EnablePaging, TRecord, AddPagingMeta<TResult, EnablePaging>>


export interface TbQueryBuilderOptions<Context> {
  ctx: Context
  ctxBuilderPreProcessor: CtxBuilderPreProcessor | undefined
  ctxBuilderResultPreProcessor: CtxBuilderResultPreProcessor | undefined
  ctxExceptionHandler: CtxExceptionHandler | undefined
}


export enum QueryBuilderExtKey {
  caseConvert = 'caseConvert',
  kmoreQueryId = 'kmoreQueryId',
  dbDict = 'dbDict',
  dbId = 'dbId',
  tablesJoin = '_tablesJoin',
  pagingType = 'pagingType',
  transactionalProcessed = 'transactionalProcessed',
  trxPropagateOptions = 'trxPropagateOptions',
  trxPropagated = 'trxPropagated',
  rowLockLevel = 'rowLockLevel',
}
export interface QueryBuilderExtName<D extends object = object> {
  caseConvert: CaseType
  kmoreQueryId: symbol
  dbDict: DbDict<D>
  dbId: string
  _tablesJoin: string[]
  pagingType?: 'counter' | 'pager'
  trxPropagateOptions?: TrxPropagateOptions
  trxPropagated?: boolean
  /**
   * Propagation rowlock level
   * @default {@link RowLockLevel}
   */
  rowLockLevel: RowLockLevel | undefined
  transactionalProcessed: boolean | undefined
}


export type SmartJoin<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
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
) => KmoreQueryBuilder<D, CaseConvert, EnablePaging, TResult2, TResult2[]>


export type CtxBuilderPreProcessor = (builder: KmoreQueryBuilder) => Promise<{ builder: KmoreQueryBuilder }>
export type CtxBuilderResultPreProcessor<T = unknown> = (options: CtxBuilderResultPreProcessorOptions<T>) => Promise<T>
export type CtxExceptionHandler = (options: CtxExceptionHandlerOptions) => Promise<never>

export interface CtxBuilderResultPreProcessorOptions<Resp = unknown> {
  kmoreQueryId: symbol
  kmoreTrxId: symbol | undefined
  response: Resp
  transactionalProcessed: boolean | undefined
  trxPropagateOptions: TrxPropagateOptions | undefined
  trxPropagated: boolean | undefined
  /**
   * Propagation rowlock level
   * @default {@link RowLockLevel}
   */
  rowLockLevel: RowLockLevel | undefined
}

export interface CtxExceptionHandlerOptions extends Omit<CtxBuilderResultPreProcessorOptions, 'response'> {
  exception: unknown
}


export interface QueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = unknown[],
> extends
  // Knex.QueryInterface<TRecord, TResult>,
  // Knex.QueryBuilder<TRecord, TResult>
  ChainableInterface<TResult, EnablePaging>,
  QueryBuilderExtName<D>,
  Knex.QueryInterface<TRecord, TResult, D, CaseConvert, EnablePaging> {

  // methods of knex.QueryBuilder need to be redefined here

  or: QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
  not: QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
  and: QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  forUpdate(...tableNames: string[]): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
  forUpdate(tableNames: readonly string[]): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  forShare(...tableNames: string[]): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
  forShare(tableNames: readonly string[]): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  forNoKeyUpdate(...tableNames: string[]): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
  forNoKeyUpdate(
    tableNames: readonly string[]
  ): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  forKeyShare(...tableNames: string[]): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
  forKeyShare(tableNames: readonly string[]): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  skipLocked(): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
  noWait(): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  // eslint-disable-next-line @typescript-eslint/ban-types
  on(event: string, callback: Function): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  queryContext(context: any): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  clone(): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
  timeout(
    ms: number,
    options?: { cancel?: boolean }
  ): QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

}


type ChainableInterface<
  TResult = any,
  EnablePaging extends PagingCategory = 0,
> = Knex.ChainableInterface<AddPagingMeta<ResolveResult<TResult>, EnablePaging>>

// If we have more categories of deferred selection in future,
// this will combine all of them
type ResolveResult<S, EnablePaging extends PagingCategory = 0>
  = AddPagingMeta<DeferredKeySelectionNS.Resolve<S>, EnablePaging>


