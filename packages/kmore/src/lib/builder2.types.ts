/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
import type {
  CaseConvertTable,
  CaseType,
} from '@waiting/shared-types'
import type { Knex } from 'knex'

import type { ResolveResult, QueryBuilderExtMethod, TbQueryBuilderOptions, QueryBuilderExtName } from './builder.types.js'
import type { AddPagingMeta, CalcPagingCat, PagingCategory, PagingOptions } from './paging.types.js'


// declare module 'Knex' {
//   interface QueryBuilder<
//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     TRecord extends {} = any, TResult = any,
//   > {
//     foo: string
//   }
// }

declare module 'knex/types/index.js' {
  namespace Knex {
    // @ts-expect-error
    interface QueryInterface<
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      TRecord extends object = any, TResult = any,
      D extends object = any,
      CaseConvert extends CaseType = CaseType,
      EnablePaging extends PagingCategory = 0,
    >
      extends
      QueryBuilderExtMethod<D, CaseConvert, EnablePaging, TRecord> {
      dummy: () => KmoreQueryBuilder<D, CaseConvert, EnablePaging, TRecord, TResult>
    }

    // interface QueryInterface<
    //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //   TRecord extends {} = any, TResult = any,
    // > {
    //   foo: () => QueryInterface<TRecord, TResult>
    // }
  }
}

// @ts-expect-error
export interface QueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = unknown[],
> extends
  ChainableInterface<TResult, EnablePaging>,
  QueryBuilderExtName<D>,
  // Knex.QueryInterface<TRecord, TResult, D, CaseConvert, EnablePaging>,
  Knex.QueryInterface<TRecord, TResult>,
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

type AutoPaging<
  TRecord extends object = any,
> = <Wrap extends boolean | undefined = false>(options?: Partial<PagingOptions>, wrapOutput?: Wrap)
=> KmoreQueryBuilder<any, any, CalcPagingCat<Wrap>, TRecord, TRecord[]>
