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
import { ArrayIfAlready, ArrayMember, Dict, IncompatibleToAlt, SafePartial } from './knex.types.js'
import type { AddPagingMeta, CalcPagingCat, PagingCategory, PagingOptions } from './paging.types.js'
import type { RowLockLevel, TrxPropagateOptions } from './trx.types.js'



export type KmoreQueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = any,
> = QueryBuilderExtName<D>
& QueryBuilderExtMethod<D, CaseConvert, EnablePaging, TRecord>
& QueryBuilder<D, CaseConvert, EnablePaging, TRecord, AddPagingMeta<TResult, EnablePaging>>

type OmitQueryBuilderKeys = 'select' | 'where' | 'orderBy' | 'columns' | keyof Knex.ChainableInterface

interface QueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = any,
> extends
  Knex.ChainableInterface<AddPagingMeta<ResolveResult<TResult>, EnablePaging>>,
  Omit<Knex.QueryBuilder<TRecord, TResult>, OmitQueryBuilderKeys> {

  select: Select<D, CaseConvert, EnablePaging, TRecord, TResult>
  where: Where<D, CaseConvert, EnablePaging, TRecord, TResult>
  orderBy: OrderBy<D, CaseConvert, EnablePaging, TRecord, TResult>
  columns: Select<D, CaseConvert, EnablePaging, TRecord, TResult>
}

export type DbQueryBuilder<
  Context,
  D,
  Prefix extends string,
  CaseConvert extends CaseType,
> = {
  /** ref_tb_name: () => knex('tb_name') */
  [tb in keyof D as `${Prefix}${tb & string}`]:
  // @ts-expect-error
  TbQueryBuilder<D, CaseConvert, CaseConvertTable<D[tb], CaseConvert>, Context>
}

export type TbQueryBuilder<D extends {}, CaseConvert extends CaseType, TRecord extends {}, Context>
  = (options?: Partial<TbQueryBuilderOptions<Context>>) => KmoreQueryBuilder<D, CaseConvert, 0, TRecord, TRecord[]>

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
interface QueryBuilderExtName<D extends {} = {}> {
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


interface QueryBuilderExtMethod<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends {} = any,
> {
  smartCrossJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
  smartInnerJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
  smartJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
  smartLeftJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
  smartRightJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
  autoPaging: AutoPaging<D, CaseConvert, TRecord>
}

type AutoPaging<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  TRecord extends {} = any,
> = <Wrap extends boolean | undefined = false>(options?: Partial<PagingOptions>, wrapOutput?: Wrap)
=> KmoreQueryBuilder<D, CaseConvert, CalcPagingCat<Wrap>, TRecord, TRecord[]>



type SmartJoin<
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


/*  ---------------- re-declare types of Knex ----------------  */

interface Select<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends {} = any, TResult = unknown[],
> extends
  AliasQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>,
  ColumnNameQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult> {

  (): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  <
    TResult2 = ArrayIfAlready<TResult, any>,
    TInnerRecord extends {} = any,
    TInnerResult = any,
  >(
    ...subQueryBuilders: readonly KmoreQueryBuilder<D, CaseConvert, EnablePaging, TInnerRecord, TInnerResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult2>

  <
    TResult2 = ArrayIfAlready<TResult, any>,
    TInnerRecord extends {} = any,
    TInnerResult = any,
  >(
    subQueryBuilders: readonly KmoreQueryBuilder<D, CaseConvert, EnablePaging, TInnerRecord, TInnerResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult2>
}


interface AliasQueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = unknown[],
> {

  <
    AliasUT extends Knex.InferrableColumnDescriptor<Knex.ResolveTableType<TRecord>>[],
    TResult2 = ArrayIfAlready<
      TResult,
      DeferredKeySelectionNS.Augment<
        UnwrapArrayMember<TResult>,
        Knex.ResolveTableType<TRecord>,
        IncompatibleToAlt<ArrayMember<AliasUT>, string, never>, Knex.IntersectAliases<AliasUT>>
    >,
  >(
    ...aliases: AliasUT
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult2>

  <
    AliasUT extends Knex.InferrableColumnDescriptor<Knex.ResolveTableType<TRecord>>[],
    TResult2 = ArrayIfAlready<
      TResult,
      DeferredKeySelectionNS.Augment<
        UnwrapArrayMember<TResult>,
        Knex.ResolveTableType<TRecord>,
        IncompatibleToAlt<ArrayMember<AliasUT>, string, never>, Knex.IntersectAliases<AliasUT>>
    >,
  >(
    aliases: AliasUT
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult2>

  <
    AliasUT extends (Dict | string)[],
    TResult2 = ArrayIfAlready<
      TResult,
      DeferredKeySelectionNS.Augment<
        UnwrapArrayMember<TResult>,
        Knex.ResolveTableType<TRecord>,
        IncompatibleToAlt<ArrayMember<AliasUT>, string, never>, Knex.IntersectAliases<AliasUT> >
    >,
  >(
    ...aliases: AliasUT
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult2>

  <
    AliasUT extends (Dict | string)[],
    TResult2 = ArrayIfAlready<
      TResult,
      DeferredKeySelectionNS.Augment<
        UnwrapArrayMember<TResult>,
        TRecord,
        IncompatibleToAlt<ArrayMember<AliasUT>, string, never>, Knex.IntersectAliases<AliasUT> >
    >,
  >(
    aliases: AliasUT
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult2>
}

// commons
interface ColumnNameQueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = unknown[],
> {

  // When all columns are known to be keys of original record,
  // we can extend our selection by these columns
  (columnName: '*'): KmoreQueryBuilder<
    D,
    CaseConvert,
    EnablePaging,
    TRecord,
    ArrayIfAlready<TResult, DeferredKeySelectionNS.DeferredKeySelection<TRecord, string>>
  >

  <
    ColNameUT extends keyof Knex.ResolveTableType<TRecord>,
    TResult2 = DeferredKeySelectionNS.Augment<
      UnwrapArrayMember<TResult>,
      Knex.ResolveTableType<TRecord>,
    ColNameUT & string
    >[],
  >(
    ...columnNames: readonly ColNameUT[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult2>

  <
    ColNameUT extends keyof Knex.ResolveTableType<TRecord>,
    TResult2 = DeferredKeySelectionNS.Augment<
      UnwrapArrayMember<TResult>,
      Knex.ResolveTableType<TRecord>,
    ColNameUT & string
    >[],
  >(
    columnNames: readonly ColNameUT[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult2>

  // For non-inferrable column selection, we will allow consumer to
  // specify result type and if not widen the result to entire record type with any omissions permitted
  <
    TResult2 = DeferredKeySelectionNS.Augment<
      UnwrapArrayMember<TResult>,
      SafePartial<TRecord>,
    keyof TRecord & string
    >[],
  >(
    ...columnNames: readonly Knex.ColumnDescriptor<TRecord, TResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult2>

  <
    TResult2 = DeferredKeySelectionNS.Augment<
      UnwrapArrayMember<TResult>,
      SafePartial<TRecord>,
    keyof TRecord & string
    >[],
  >(
    columnNames: readonly Knex.ColumnDescriptor<TRecord, TResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult2>
}


interface OrderBy<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = unknown[],
> {

  (
    columnName: keyof TRecord | QueryBuilder,
    order?: 'asc' | 'desc' | undefined,
    nulls?: 'first' | 'last' | undefined
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  (
    columnName: string | QueryBuilder,
    order?: string | undefined,
    nulls?: string | undefined
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  (
    columnDefs: (
      | keyof TRecord
      | Readonly<{
        column: keyof TRecord | QueryBuilder,
        order?: 'asc' | 'desc' | undefined,
        nulls?: 'first' | 'last' | undefined,
      }>)[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  (
    columnDefs: (
      | string
      | Readonly<{
        column: string | QueryBuilder,
        order?: string | undefined,
        nulls?: string | undefined,
      }>)[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
}


// If we have more categories of deferred selection in future,
// this will combine all of them
type ResolveResult<S, EnablePaging extends PagingCategory = 0>
  = AddPagingMeta<DeferredKeySelectionNS.Resolve<S>, EnablePaging>

type ComparisonOperator = '=' | '>' | '>=' | '<' | '<=' | '<>'

export interface Where<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = any,
> extends WhereRaw<D, CaseConvert, EnablePaging, TRecord, TResult> {

  (raw: Knex.Raw): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  (callback: Knex.QueryCallback<TRecord, TResult>): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  (object: Knex.DbRecord<Knex.ResolveTableType<TRecord>>): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  (object: Readonly<Object>): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  <T extends keyof Knex.ResolveTableType<TRecord>>(
    columnName: T,
    value: Knex.DbColumn<Knex.ResolveTableType<TRecord>[T]> | null
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  (columnName: string, value: Knex.Value | null): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  <T extends keyof Knex.ResolveTableType<TRecord>>(
    columnName: T,
    operator: ComparisonOperator,
    value: Knex.DbColumn<Knex.ResolveTableType<TRecord>[T]> | null
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  (columnName: string, operator: string, value: Knex.Value | null):
  KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  <
    T extends keyof Knex.ResolveTableType<TRecord>,
    TRecordInner extends {},
    TResultInner,
  >(
    columnName: T,
    operator: ComparisonOperator,
    value: Knex.QueryBuilder<TRecordInner, TResultInner>
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  <TRecordInner extends {}, TResultInner>(
    columnName: string,
    operator: string,
    value: Knex.QueryBuilder<TRecordInner, TResultInner>
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  (left: Knex.Raw, operator: string, right: Knex.Value | null): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>

  <TRecordInner extends {}, TResultInner>(
    left: Knex.Raw,
    operator: string,
    right: Knex.QueryBuilder<TRecordInner, TResultInner>
  ): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
}

interface WhereRaw<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = unknown[],
>
  extends Knex.RawQueryBuilder<TRecord, TResult> {
  (condition: boolean): KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
}


