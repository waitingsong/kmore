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

import type { ResolveResult } from './builder.types.js'
import type { AddPagingMeta, CalcPagingCat, PagingCategory, PagingOptions } from './paging.types.js'
import type { RowLockLevel, TrxPropagateOptions } from './trx.types.js'


export class KmoreQueryBuilderX<
  D extends object = any,
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = any[],
> implements QueryBuilderExtName<D>, QueryBuilderExtMethod<D, CaseConvert, EnablePage, TRecord> {

  caseConvert: CaseType
  kmoreQueryId: symbol
  dbDict: DbDict<D>
  dbId: string
  _tablesJoin: string[]
  pagingType?: 'counter' | 'pager'
  trxPropagateOptions?: TrxPropagateOptions
  trxPropagated?: boolean
  rowLockLevel: RowLockLevel | undefined
  transactionalProcessed: boolean | undefined

  smartCrossJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
  smartInnerJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
  smartJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
  smartLeftJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
  smartRightJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
  autoPaging: AutoPaging<D, CaseConvert, TRecord>

  select<TRecord2 extends object = TRecord, TResult2 = TResult>(...args: Parameters<Knex.Select<TRecord, TResult>>): this {
    void args
    return this
  }

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

export type KmoreQueryBuilder<
  D extends object = any,
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = any,
> = QueryBuilder<D, CaseConvert, EnablePage, TRecord, AddPagingMeta<TResult, EnablePage>>


type KmoreQueryInterface<
  D extends object = any,
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends object = any, TResult = any,
> = {
  [K in keyof Knex.QueryInterface<TRecord, TResult>]: KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>
}


interface QueryBuilder<
  D extends object = any,
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
  TRecord extends {} = any,
  TResult = any,
> extends
  KmoreQueryInterface<D, CaseConvert, EnablePage, TRecord, TResult>,
  Knex.ChainableInterface<AddPagingMeta<ResolveResult<TResult>, EnablePage>> {

}


