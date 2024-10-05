/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
/* eslint-disable @typescript-eslint/unified-signatures */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CaseType, UnwrapArrayMember } from '@waiting/shared-types'
import type { Knex } from 'knex'

import type { KmoreQueryBuilder, QueryBuilder, SmartJoin } from './builder/builder.types.js'
import type * as DeferredKeySelectionNS from './knex.deferred-key-selection-ns.types.js'
import type { ArrayIfAlready, ArrayMember, ComparisonOperator, Dict, IncompatibleToAlt, SafePartial } from './knex.types.js'
import type { AddPagingMeta, CalcPagingCat, PagingCategory, PagingOptions } from './paging.types.js'


declare module 'knex/types/index.js' {
  namespace Knex {
    // @ts-expect-error
    export interface QueryInterface<
      TRecord extends object = any, TResult = any,
      D extends object = any,
      CaseConvert extends CaseType = CaseType,
    > extends
      QueryBuilderExtMethod<D, CaseConvert, TRecord, TResult>,
      QueryInterfacePatch<D, CaseConvert, TRecord, TResult> {

      dummy: <
        D2 extends object = D,
        CaseConvert2 extends CaseType = CaseConvert,
      >() => KmoreQueryBuilder<D2, CaseConvert2, TRecord, TResult>
    }
  }
}


export interface QueryBuilderExtMethod<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any,
  TResult = unknown[],
> {
  smartCrossJoin: SmartJoin<D, CaseConvert, TRecord>
  smartInnerJoin: SmartJoin<D, CaseConvert, TRecord>
  smartJoin: SmartJoin<D, CaseConvert, TRecord>
  smartLeftJoin: SmartJoin<D, CaseConvert, TRecord>
  smartRightJoin: SmartJoin<D, CaseConvert, TRecord>
  /**
   * @note Should be called as late as possible, and before then()
   */
  autoPaging: AutoPaging<D, CaseConvert, TRecord, TResult>
}

type AutoPaging<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any,
  TResult = unknown[],
> = <Wrap extends boolean | undefined = false>(options?: Partial<PagingOptions>, wrapOutput?: Wrap)
=> KmoreQueryBuilder<D, CaseConvert, TRecord, ResolveResult<TResult, CalcPagingCat<Wrap>>>

// If we have more categories of deferred selection in future,
// this will combine all of them
type ResolveResult<S, EnablePaging extends PagingCategory = 0>
  = AddPagingMeta<DeferredKeySelectionNS.Resolve<S>, EnablePaging>

// type ChainableInterface<
//   TResult = any,
//   EnablePaging extends PagingCategory = 0,
// > = Knex.ChainableInterface<AddPagingMeta<ResolveResult<TResult>, EnablePaging>>



interface QueryInterfacePatch<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any,
  TResult = any,
> {

  select: Select<D, CaseConvert, TRecord, TResult>
  where: Where<D, CaseConvert, TRecord, TResult>
  orderBy: OrderBy<D, CaseConvert, TRecord, TResult>
  columns: Select<D, CaseConvert, TRecord, TResult>
}

/*  ---------------- re-declare types of Knex ----------------  */

interface Select<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any, TResult = unknown[],
> extends
  AliasQueryBuilder<D, CaseConvert, TRecord, TResult>,
  ColumnNameQueryBuilder<D, CaseConvert, TRecord, TResult> {

  (): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  <
    TResult2 = ArrayIfAlready<TResult, any>,
    TInnerRecord extends object = any,
    TInnerResult = any,
  >(
    ...subQueryBuilders: readonly KmoreQueryBuilder<D, CaseConvert, TInnerRecord, TInnerResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult2>

  <
    TResult2 = ArrayIfAlready<TResult, any>,
    TInnerRecord extends object = any,
    TInnerResult = any,
  >(
    subQueryBuilders: readonly KmoreQueryBuilder<D, CaseConvert, TInnerRecord, TInnerResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult2>
}


interface AliasQueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any,
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
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult2>

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
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult2>

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
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult2>

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
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult2>
}

// commons
interface ColumnNameQueryBuilder<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any,
  TResult = unknown[],
> {

  // When all columns are known to be keys of original record,
  // we can extend our selection by these columns
  (columnName: '*'): KmoreQueryBuilder<
    D,
    CaseConvert,
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
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult2>

  <
    ColNameUT extends keyof Knex.ResolveTableType<TRecord>,
    TResult2 = DeferredKeySelectionNS.Augment<
      UnwrapArrayMember<TResult>,
      Knex.ResolveTableType<TRecord>,
    ColNameUT & string
    >[],
  >(
    columnNames: readonly ColNameUT[]
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult2>

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
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult2>

  <
    TResult2 = DeferredKeySelectionNS.Augment<
      UnwrapArrayMember<TResult>,
      SafePartial<TRecord>,
    keyof TRecord & string
    >[],
  >(
    columnNames: readonly Knex.ColumnDescriptor<TRecord, TResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult2>
}


interface OrderBy<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any,
  TResult = unknown[],
> {

  (
    columnName: keyof TRecord | QueryBuilder,
    order?: 'asc' | 'desc',
    nulls?: 'first' | 'last'
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  (
    columnName: string | QueryBuilder,
    order?: string,
    nulls?: string
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  (
    columnDefs: (
      | keyof TRecord
      | Readonly<{
        column: keyof TRecord | QueryBuilder,
        order?: 'asc' | 'desc' | undefined,
        nulls?: 'first' | 'last' | undefined,
      }>)[]
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  (
    columnDefs: (
      | string
      | Readonly<{
        column: string | QueryBuilder,
        order?: string | undefined,
        nulls?: string | undefined,
      }>)[]
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>
}



interface Where<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any,
  TResult = any,
> extends WhereRaw<D, CaseConvert, TRecord, TResult> {

  (raw: Knex.Raw): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  (callback: Knex.QueryCallback<TRecord, TResult>): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  (object: Knex.DbRecord<Knex.ResolveTableType<TRecord>>): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  (object: Readonly<object>): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  <T extends keyof Knex.ResolveTableType<TRecord>>(
    columnName: T,
    value: Knex.DbColumn<Knex.ResolveTableType<TRecord>[T]> | null
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  (columnName: string, value: Knex.Value | null): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  <T extends keyof Knex.ResolveTableType<TRecord>>(
    columnName: T,
    operator: ComparisonOperator,
    value: Knex.DbColumn<Knex.ResolveTableType<TRecord>[T]> | null
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  (columnName: string, operator: string, value: Knex.Value | null):
  KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  <
    T extends keyof Knex.ResolveTableType<TRecord>,
    TRecordInner extends object,
    TResultInner,
  >(
    columnName: T,
    operator: ComparisonOperator,
    value: Knex.QueryBuilder<TRecordInner, TResultInner>
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  <TRecordInner extends object, TResultInner>(
    columnName: string,
    operator: string,
    value: Knex.QueryBuilder<TRecordInner, TResultInner>
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  (left: Knex.Raw, operator: string, right: Knex.Value | null): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>

  <TRecordInner extends object, TResultInner>(
    left: Knex.Raw,
    operator: string,
    right: Knex.QueryBuilder<TRecordInner, TResultInner>
  ): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>
}

interface WhereRaw<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  TRecord extends object = any,
  TResult = unknown[],
>
  extends Knex.RawQueryBuilder<TRecord, TResult> {
  (condition: boolean): KmoreQueryBuilder<D, CaseConvert, TRecord, TResult>
}


