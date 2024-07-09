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
  D extends object,
  CaseConvert extends CaseType,
> = {
  /** tb_name: () => knex('tb_name') */
  [tb in keyof D as `${tb & string}`]: D[tb] extends object
    ? TbQueryBuilder<D, CaseConvert, CaseConvertTable<D[tb], CaseConvert>, Context>
    : never
}

export type TbQueryBuilder<D extends {}, CaseConvert extends CaseType, TRecord extends {}, Context>
  = (options?: Partial<TbQueryBuilderOptions<Context>>) => KmoreQueryBuilder<D, CaseConvert, 0, TRecord, TRecord[]>

export interface TbQueryBuilderOptions<Context> {
  ctx: Context
  ctxBuilderPreProcessor: CtxBuilderPreProcessor | undefined
  ctxBuilderResultPreProcessor: CtxBuilderResultPreProcessor | undefined
  ctxExceptionHandler: CtxExceptionHandler | undefined
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


// If we have more categories of deferred selection in future,
// this will combine all of them
type ResolveResult<S, EnablePage extends PagingCategory = 0>
  = AddPagingMeta<DeferredKeySelectionNS.Resolve<S>, EnablePage>


