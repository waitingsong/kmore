/* eslint-disable @typescript-eslint/unified-signatures */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type {
  CaseType,
  UnwrapArrayMember,
} from '@waiting/shared-types'
import type { Knex } from 'knex'

import type { KmoreQueryBuilder, QueryBuilder, SmartJoin } from './builder.types.js'
import type * as DeferredKeySelectionNS from './knex.deferred-key-selection-ns.types.js'
import type { ArrayIfAlready, ArrayMember, ComparisonOperator, Dict, IncompatibleToAlt, SafePartial } from './knex.types.js'
import type { CalcPagingCat, PagingCategory, PagingOptions } from './paging.types.js'


declare module 'knex/types/index.js' {
  namespace Knex {
    // @ts-expect-error
    export interface QueryInterface<
      TRecord extends object = any, TResult = any,
      D extends object = any,
      CaseConvert extends CaseType = CaseType,
      EnablePaging extends PagingCategory = 0,
    > extends QueryBuilderExtMethod<D, CaseConvert, EnablePaging, TRecord, TResult>,
      QueryInterfacePatch<D, CaseConvert, EnablePaging, TRecord, TResult> {

      dummy: <
        D2 extends object = D,
        CaseConvert2 extends CaseType = CaseConvert,
        EnablePaging2 extends PagingCategory = EnablePaging,
      >() => KmoreQueryBuilder<D2, CaseConvert2, EnablePaging2, TRecord, TResult>
    }
  }
}


export interface QueryBuilderExtMethod<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = unknown[],
> {
  smartCrossJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
  smartInnerJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
  smartJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
  smartLeftJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
  smartRightJoin: SmartJoin<D, CaseConvert, EnablePaging, TRecord>
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
=> KmoreQueryBuilder<D, CaseConvert, CalcPagingCat<Wrap>, TRecord, TResult>



interface QueryInterfacePatch<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends object = any,
  TResult = any,
> {

  select: Select<D, CaseConvert, EnablePaging, TRecord, TResult>
  where: Where<D, CaseConvert, EnablePaging, TRecord, TResult>
  orderBy: OrderBy<D, CaseConvert, EnablePaging, TRecord, TResult>
  columns: Select<D, CaseConvert, EnablePaging, TRecord, TResult>
}

/*  ---------------- re-declare types of Knex ----------------  */

interface Select<
  D extends object = object,
  CaseConvert extends CaseType = CaseType,
  EnablePaging extends PagingCategory = 0,
  TRecord extends object = any, TResult = unknown[],
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



interface Where<
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


