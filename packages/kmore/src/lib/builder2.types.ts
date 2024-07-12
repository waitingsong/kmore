/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CaseConvertTable,
  CaseType,
} from '@waiting/shared-types'
import type { Knex } from 'knex'

import type { ResolveResult, QueryBuilderExtMethod, TbQueryBuilderOptions, QueryBuilderExtName } from './builder.types.js'
import type { AddPagingMeta, PagingCategory } from './paging.types.js'


declare namespace Knex {
  interface QueryInterface<
    TRecord extends object = any, TResult = any,
    D extends object = any,
    CaseConvert extends CaseType = CaseType,
    EnablePaging extends PagingCategory = 0,
  >
    extends
    QueryBuilderExtMethod<D, CaseConvert, EnablePaging, TRecord>,
    QueryBuilderExtName<D> {
  }
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


export type TbQueryBuilder<D extends object, CaseConvert extends CaseType, TRecord extends object, Context>
  = (options?: Partial<TbQueryBuilderOptions<Context>>) => KmoreQueryBuilder<D, CaseConvert, 0, TRecord, TRecord[]>


export type KmoreQueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = unknown[],
> = QueryBuilder<D, CaseConvert, EnablePaging, TRecord, AddPagingMeta<TResult, EnablePaging>>

// @ts-expect-error
export interface QueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = unknown[],
> extends
  // QueryInterface<D, CaseConvert, EnablePaging, TRecord, TResult>,
  ChainableInterface<TResult, EnablePaging>,
  // QueryBuilderExtMethod<D, CaseConvert, EnablePaging, TRecord>,
  // QueryBuilderExtName<D>,
  Knex.QueryInterface<TRecord, TResult, D, CaseConvert, EnablePaging>,
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

}


type ChainableInterface<
  TResult = any,
  EnablePaging extends PagingCategory = 0,
> = Knex.ChainableInterface<AddPagingMeta<ResolveResult<TResult>, EnablePaging>>

