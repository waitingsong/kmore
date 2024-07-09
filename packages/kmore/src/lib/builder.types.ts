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
import type { PropagationType } from './propagation.types.js'


/**
 * - 0: No paging
 * - 1: Paging, PagingMeta on response Array
 * - 2: paging, wrap response as `PageWrapType`
 */
type PagingCategory = 0 | 1 | 2

export type KmoreQueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = any,
> = QueryBuilderExtName<D>
& QueryBuilderExtMethod<D, CaseConvert, EnablePage, TRecord>
& QueryBuilder<D, CaseConvert, EnablePage, TRecord, AddPagingMeta<TResult, EnablePage>>

type OmitQueryBuilderKeys = 'select' | 'where' | 'orderBy' | 'columns' | keyof Knex.ChainableInterface

interface QueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = any,
> extends
  Knex.ChainableInterface<AddPagingMeta<ResolveResult<TResult>, EnablePage>>,
  Omit<Knex.QueryBuilder<TRecord, TResult>, OmitQueryBuilderKeys> {

  select: Select<D, CaseConvert, EnablePage, TRecord, TResult>
  where: Where<D, CaseConvert, EnablePage, TRecord, TResult>
  orderBy: OrderBy<D, CaseConvert, EnablePage, TRecord, TResult>
  columns: Select<D, CaseConvert, EnablePage, TRecord, TResult>
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
export interface TrxPropagateOptions {
  entryKey: string
  key: string
  dbId: string
  type: PropagationType
  path: string
  className: string
  funcName: string
  methodName: string
  line: number
  column: number
  /**
   * @default {@link RowLockLevel.ForShare}
   */
  readRowLockLevel: RowLockLevel
  /**
   * @default {@link RowLockLevel.ForUpdate}
   */
  writeRowLockLevel: RowLockLevel
}

/**
 * Used for `@Transactional()` decorator
 */
export enum RowLockLevel {
  ForShare = 'FOR_SHARE',
  ForUpdate = 'FOR_UPDATE',
  None = 'None',
}

interface QueryBuilderExtMethod<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends {} = any,
> {
  smartCrossJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
  smartInnerJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
  smartJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
  smartLeftJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
  smartRightJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
  autoPaging: AutoPaging<D, CaseConvert, TRecord>
}

type AutoPaging<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  TRecord extends {} = any,
> = <Wrap extends boolean | undefined = false>(options?: Partial<PagingOptions>, wrapOutput?: Wrap)
=> KmoreQueryBuilder<D, CaseConvert, CalcPagingCat<Wrap>, TRecord, TRecord[]>

type CalcPagingCat<T> = T extends true ? 2 : 1

type AddPagingMeta<
  TSelection,
  EnablePage extends PagingCategory = 0,
> = EnablePage extends 0
  ? TSelection
  : TSelection extends (infer R)[]
    ? EnablePage extends 2
      ? WrapPageOutput<R>
      : PageRawType<R>
    : TSelection

// type RemovePagingMeta<T> = T extends ((infer M)[] & PagingMeta) ? M[] : T
type WrapPageOutput<T> = T extends PageWrapType ? T : PageWrapType<T>


type SmartJoin<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
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
) => KmoreQueryBuilder<D, CaseConvert, EnablePage, TResult2, TResult2[]>


export interface PagingOptions {
  /**
   * @default true
   */
  enable: boolean
  /**
   * Current page number, start from 1
   * @default 1
   */
  page: number
  /**
   * @default 10
   */
  pageSize: number
}

/**
 * Note: keyof PagingMeta is not enumerable
 */
export type PageRawType<T = unknown> = T[] & PagingMeta
export interface PageWrapType<T = unknown> extends PagingMeta { rows: T[] }

export interface PagingMeta {
  /**
   * Total count of rows in table
   *
   * @note This is the number of query response rows,
   *  not the number of rows in the current page,
   *  also not the number of pages.
   */
  total: number
  /**
   * Current page number, start from 1
   */
  page: number
  /**
   * Number of rows of each page.
   * The number rows of the last page may be less than this value
   */
  pageSize: number
}


/*  ---------------- re-declare types of Knex ----------------  */

interface Select<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends {} = any, TResult = unknown[],
> extends
  AliasQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>,
  ColumnNameQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult> {

  (): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  <
    TResult2 = ArrayIfAlready<TResult, any>,
    TInnerRecord extends {} = any,
    TInnerResult = any,
  >(
    ...subQueryBuilders: readonly KmoreQueryBuilder<D, CaseConvert, EnablePage, TInnerRecord, TInnerResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>

  <
    TResult2 = ArrayIfAlready<TResult, any>,
    TInnerRecord extends {} = any,
    TInnerResult = any,
  >(
    subQueryBuilders: readonly KmoreQueryBuilder<D, CaseConvert, EnablePage, TInnerRecord, TInnerResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>
}


interface AliasQueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
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
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>

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
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>

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
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>

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
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>
}

// commons
interface ColumnNameQueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = unknown[],
> {

  // When all columns are known to be keys of original record,
  // we can extend our selection by these columns
  (columnName: '*'): KmoreQueryBuilder<
    D,
    CaseConvert,
    EnablePage,
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
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>

  <
    ColNameUT extends keyof Knex.ResolveTableType<TRecord>,
    TResult2 = DeferredKeySelectionNS.Augment<
      UnwrapArrayMember<TResult>,
      Knex.ResolveTableType<TRecord>,
    ColNameUT & string
    >[],
  >(
    columnNames: readonly ColNameUT[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>

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
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>

  <
    TResult2 = DeferredKeySelectionNS.Augment<
      UnwrapArrayMember<TResult>,
      SafePartial<TRecord>,
    keyof TRecord & string
    >[],
  >(
    columnNames: readonly Knex.ColumnDescriptor<TRecord, TResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>
}


interface OrderBy<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = unknown[],
> {

  (
    columnName: keyof TRecord | QueryBuilder,
    order?: 'asc' | 'desc' | undefined,
    nulls?: 'first' | 'last' | undefined
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (
    columnName: string | QueryBuilder,
    order?: string | undefined,
    nulls?: string | undefined
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (
    columnDefs: (
      | keyof TRecord
      | Readonly<{
        column: keyof TRecord | QueryBuilder,
        order?: 'asc' | 'desc' | undefined,
        nulls?: 'first' | 'last' | undefined,
      }>)[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (
    columnDefs: (
      | string
      | Readonly<{
        column: string | QueryBuilder,
        order?: string | undefined,
        nulls?: string | undefined,
      }>)[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>
}


// If we have more categories of deferred selection in future,
// this will combine all of them
type ResolveResult<S, EnablePage extends PagingCategory = 0>
  = AddPagingMeta<DeferredKeySelectionNS.Resolve<S>, EnablePage>

type ComparisonOperator = '=' | '>' | '>=' | '<' | '<=' | '<>'

export interface Where<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = any,
> extends WhereRaw<D, CaseConvert, EnablePage, TRecord, TResult> {

  (raw: Knex.Raw): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (callback: Knex.QueryCallback<TRecord, TResult>): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (object: Knex.DbRecord<Knex.ResolveTableType<TRecord>>): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (object: Readonly<Object>): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  <T extends keyof Knex.ResolveTableType<TRecord>>(
    columnName: T,
    value: Knex.DbColumn<Knex.ResolveTableType<TRecord>[T]> | null
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (columnName: string, value: Knex.Value | null): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  <T extends keyof Knex.ResolveTableType<TRecord>>(
    columnName: T,
    operator: ComparisonOperator,
    value: Knex.DbColumn<Knex.ResolveTableType<TRecord>[T]> | null
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (columnName: string, operator: string, value: Knex.Value | null):
  KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  <
    T extends keyof Knex.ResolveTableType<TRecord>,
    TRecordInner extends {},
    TResultInner,
  >(
    columnName: T,
    operator: ComparisonOperator,
    value: Knex.QueryBuilder<TRecordInner, TResultInner>
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  <TRecordInner extends {}, TResultInner>(
    columnName: string,
    operator: string,
    value: Knex.QueryBuilder<TRecordInner, TResultInner>
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (left: Knex.Raw, operator: string, right: Knex.Value | null): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  <TRecordInner extends {}, TResultInner>(
    left: Knex.Raw,
    operator: string,
    right: Knex.QueryBuilder<TRecordInner, TResultInner>
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>
}

interface WhereRaw<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = unknown[],
>
  extends Knex.RawQueryBuilder<TRecord, TResult> {
  (condition: boolean): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>
}


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
