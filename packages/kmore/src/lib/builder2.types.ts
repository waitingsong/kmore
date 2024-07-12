/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CaseConvertTable,
  CaseType,
} from '@waiting/shared-types'
import type { Knex } from 'knex'

import type { ResolveResult, QueryBuilderExtMethod, TbQueryBuilderOptions, QueryBuilderExtName } from './builder.types.js'
import type { AddPagingMeta, PagingCategory } from './paging.types.js'


// declare namespace Knex {
//   interface QueryBuilder<
//     TRecord extends object = any, TResult = any,
//     D extends object = any,
//     CaseConvert extends CaseType = CaseType,
//     EnablePaging extends PagingCategory = 0,
//   > {
//     smartJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
//   }
// }


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


export type TbQueryBuilder<D extends object, CaseConvert extends CaseType, TRecord extends object, Context>
  = (options?: Partial<TbQueryBuilderOptions<Context>>) => KmoreQueryBuilder<D, CaseConvert, 0, TRecord, TRecord[]>


export type KmoreQueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = any,
> = QueryBuilder<D, CaseConvert, EnablePaging, TRecord, AddPagingMeta<TResult, EnablePaging>>

// @ts-expect-error
export interface QueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = any,
> extends
  // QueryInterface<D, CaseConvert, EnablePaging, TRecord, TResult>,
  ChainableInterface<TResult, EnablePaging>,
  QueryBuilderExtMethod<D, CaseConvert, EnablePaging, TRecord>,
  QueryBuilderExtName<D>,
  Knex.QueryBuilder<TRecord, TResult> {

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

  // select: (...args: Parameters<Knex.Select<TRecord, TResult>>) => QueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
  // select: Select<D, CaseConvert, EnablePaging, TRecord, TResult>
  // select: Select<D, CaseConvert, EnablePaging, TRecord, TResult>
}




// test
// type Q1 = QueryBuilder<any, CaseType.camel, 0, any, any>['andHavingNotIn']
// const q1: Q1 = () => {
//   return
// }

// type QueryInterface<
//   D extends object = any,
//   CaseConvert extends CaseType = CaseType,
//   EnablePaging extends PagingCategory = 0,
//   TRecord extends object = any, TResult = any,
// > = {
//   [K in keyof Knex.QueryInterface<TRecord, TResult>]:
//   (...args: Parameters<Knex.QueryInterface<TRecord, TResult>[K]>) => KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
// }

type ChainableInterface<
  TResult = any,
  EnablePaging extends PagingCategory = 0,
> = Knex.ChainableInterface<AddPagingMeta<ResolveResult<TResult>, EnablePaging>>

// type QueryBuilder<
//   D extends object = any,
//   CaseConvert extends CaseType = CaseType,
//   EnablePaging extends PagingCategory = 0,
//   TRecord extends object = any,
//   TResult = any,
// > = {
//   [K in keyof Knex.QueryBuilder<TRecord, TResult>]: Knex.QueryBuilder<TRecord, TResult>[K] extends Knex.QueryBuilder<TRecord, TResult>
//     ? KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
//     : Knex.QueryBuilder<TRecord, TResult>[K]
// }



// export class KmoreQueryBuilderX<
//   D extends object = any,
//   CaseConvert extends CaseType = CaseType,
//   EnablePage extends PagingCategory = 0,
//   TRecord extends object = any,
//   TResult = any[],
// > implements QueryBuilderExtName<D>, QueryBuilderExtMethod<D, CaseConvert, EnablePage, TRecord> {

//   caseConvert: CaseType
//   kmoreQueryId: symbol
//   dbDict: DbDict<D>
//   dbId: string
//   _tablesJoin: string[]
//   pagingType?: 'counter' | 'pager'
//   trxPropagateOptions?: TrxPropagateOptions
//   trxPropagated?: boolean
//   rowLockLevel: RowLockLevel | undefined
//   transactionalProcessed: boolean | undefined

//   smartCrossJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
//   smartInnerJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
//   smartJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
//   smartLeftJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
//   smartRightJoin: SmartJoin<D, CaseConvert, EnablePage, TRecord>
//   autoPaging: AutoPaging<D, CaseConvert, TRecord>

//   select<TRecord2 extends object = TRecord, TResult2 = TResult>(...args: Parameters<Knex.Select<TRecord, TResult>>): this {
//     void args
//     return this
//   }

// }

