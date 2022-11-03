/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import {
  CaseConvertTable,
  CaseType,
  DbScopedColsByKey,
  DbScopedColsByTableType,
  JoinTableWithCaseConvert,
  SplitScopedColumn,
  StrKey,
  UnwrapArrayMember,
} from '@waiting/shared-types'
import { DbDict } from 'kmore-types'
import type { Knex } from 'knex'


export type KmoreQueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends boolean = false,
  TRecord extends {} = any,
  TResult = any
> = QueryBuilderExtName<D>
& QueryBuilderExtMethod<D, CaseConvert, IsEnabled<EnablePage>, TRecord>
& QueryBuilder<D, CaseConvert, IsEnabled<EnablePage>, TRecord, AddPagingMeta<TResult, IsEnabled<EnablePage>>>

type OmitQueryBuilderKeys = 'select' | 'where' | 'orderBy' | keyof Knex.ChainableInterface

interface QueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends boolean = false,
  TRecord extends {} = any,
  TResult = any
> extends
  Knex.ChainableInterface<AddPagingMeta<ResolveResult<TResult>, EnablePage>>,
  Omit<Knex.QueryBuilder<TRecord, TResult>, OmitQueryBuilderKeys> {

  select: Select<D, CaseConvert, EnablePage, TRecord, TResult>
  where: Where<D, CaseConvert, EnablePage, TRecord, TResult>
  orderBy: OrderBy<D, CaseConvert, EnablePage, TRecord, TResult>
}

export type DbQueryBuilder<
  Context,
  D,
  Prefix extends string,
  CaseConvert extends CaseType
> = {
  /** ref_tb_name: () => knex('tb_name') */
  [tb in keyof D as `${Prefix}${tb & string}`]:
  // @ts-expect-error
  TbQueryBuilder<D, CaseConvert, CaseConvertTable<D[tb], CaseConvert>, Context>
}

export type TbQueryBuilder<D extends {}, CaseConvert extends CaseType, TRecord extends {}, Context>
  = (ctx?: Context) => KmoreQueryBuilder<D, CaseConvert, false, TRecord, TRecord[]>

interface QueryBuilderExtName<D extends {} = {}> {
  caseConvert: CaseType
  kmoreQueryId: symbol
  dbDict: DbDict<D>
  _tablesJoin: string[]
  pagingType?: 'counter' | 'pager'
}

interface QueryBuilderExtMethod<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends boolean = false,
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
  TRecord extends {} = any
> = (options?: Partial<PagingOptions>) => KmoreQueryBuilder<D, CaseConvert, true, TRecord, TRecord[]>

type SmartJoin<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends boolean = false,
  TResult = unknown[]
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
export type PageArrayType<T = unknown> = T[] & PagingMeta
/**
 * Note: keyof PagingMeta is not enumerable
 */
export type PageDataType<T = {}> = T & PagingMeta
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

type AddPagingMeta<TSelection, EnablePage extends boolean = false> = EnablePage extends false
  ? RemovePagingMeta<TSelection>
  : TSelection extends unknown[]
    ? PageDataType<RemovePagingMeta<TSelection>>
    : TSelection

type RemovePagingMeta<T> = T extends ((infer M)[] & PagingMeta) ? M[] : T


/*  ---------------- re-declare types of Knex ----------------  */

interface Select<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends boolean = false,
  TRecord extends {} = any, TResult = unknown[]
> extends
  AliasQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>,
  ColumnNameQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult> {

  (): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  <
    TResult2 = ArrayIfAlready<TResult, any>,
    TInnerRecord extends {} = any,
    TInnerResult = any
  >(
    ...subQueryBuilders: readonly KmoreQueryBuilder<D, CaseConvert, EnablePage, TInnerRecord, TInnerResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>

  <
    TResult2 = ArrayIfAlready<TResult, any>,
    TInnerRecord extends {} = any,
    TInnerResult = any
  >(
    subQueryBuilders: readonly KmoreQueryBuilder<D, CaseConvert, EnablePage, TInnerRecord, TInnerResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>
}


interface AliasQueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends boolean = false,
  TRecord extends {} = any,
  TResult = unknown[]
> {

  <
    AliasUT extends Knex.InferrableColumnDescriptor<Knex.ResolveTableType<TRecord>>[],
    TResult2 = ArrayIfAlready<
    TResult,
    DeferredKeySelectionNS.Augment<
    UnwrapArrayMember<TResult>,
    Knex.ResolveTableType<TRecord>,
    IncompatibleToAlt<ArrayMember<AliasUT>, string, never>, Knex.IntersectAliases<AliasUT>>
    >
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
    >
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
    >
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
    >
  >(
    aliases: AliasUT
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>
}

// commons
interface ColumnNameQueryBuilder<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends boolean = false,
  TRecord extends {} = any,
  TResult = unknown[]
> {

  // When all columns are known to be keys of original record,
  // we can extend our selection by these columns
  (columnName: '*'): KmoreQueryBuilder<
  D,
  CaseConvert,
  EnablePage,
  TRecord,
  ArrayIfAlready<TResult, DeferredKeySelection<TRecord, string>>
  >

  <
    ColNameUT extends keyof Knex.ResolveTableType<TRecord>,
    TResult2 = DeferredKeySelectionNS.Augment<
    UnwrapArrayMember<TResult>,
    Knex.ResolveTableType<TRecord>,
    ColNameUT & string
    >[]
  >(
    ...columnNames: readonly ColNameUT[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>

  <
    ColNameUT extends keyof Knex.ResolveTableType<TRecord>,
    TResult2 = DeferredKeySelectionNS.Augment<
    UnwrapArrayMember<TResult>,
    Knex.ResolveTableType<TRecord>,
    ColNameUT & string
    >[]
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
    >[]
  >(
    ...columnNames: readonly Knex.ColumnDescriptor<TRecord, TResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>

  <
    TResult2 = DeferredKeySelectionNS.Augment<
    UnwrapArrayMember<TResult>,
    SafePartial<TRecord>,
    keyof TRecord & string
    >[]
  >(
    columnNames: readonly Knex.ColumnDescriptor<TRecord, TResult>[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult2>
}


interface OrderBy<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends boolean = false,
  TRecord extends {} = any,
  TResult = unknown[]
> {

  (
    columnName: keyof TRecord | QueryBuilder,
    order?: 'asc' | 'desc',
    nulls?: 'first' | 'last'
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (
    columnName: string | QueryBuilder,
    order?: string,
    nulls?: string
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (
    columnDefs: (| keyof TRecord
    | Readonly<{
      column: keyof TRecord | QueryBuilder,
      order?: 'asc' | 'desc',
      nulls?: 'first' | 'last',
    }>)[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>

  (
    columnDefs: (| string
    | Readonly<{
      column: string | QueryBuilder,
      order?: string,
      nulls?: string,
    }>)[]
  ): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>
}

type ArrayIfAlready<T1, T2> = AnyToUnknown<T1> extends any[] ? T2[] : T2
// If T is an array, get the type of member, else fall back to never
type ArrayMember<T> = T extends (infer M)[] ? M : never
type AnyToUnknown<T> = unknown extends T ? unknown : T
type CurlyCurlyToAny<T> = T extends unknown // distribute
  ? (<U>() => U extends T ? 0 : 1) extends <U>() => U extends {} ? 0 : 1
    ? any
    : T
  : never
interface Dict<T = any> { [k: string]: T }
// If T can't be assigned to TBase fallback to an alternate type TAlt
type IncompatibleToAlt<T, TBase, TAlt> = T extends TBase ? T : TAlt
type IsEnabled<T extends boolean> = T extends true ? true : false
// Retain the association of original keys with aliased keys at type level
// to facilitates type-safe aliasing for object syntax
type MappedAliasType<TBase, TAliasMapping> = {} & {
  [K in keyof TAliasMapping]: TAliasMapping[K] extends keyof TBase
    ? TBase[TAliasMapping[K]]
    : any
}

type UnknownOrCurlyCurlyToAny<T> = [UnknownToAny<T> | CurlyCurlyToAny<T>][0]
// If T is unknown then convert to any, else retain original
type UnknownToAny<T> = unknown extends T ? any : T
// Intersection conditionally applied only when TParams is non-empty
// This is primarily to keep the signatures more intuitive.
type AugmentParams<TTarget, TParams> = TParams extends {}
  ? keyof TParams extends never
    ? TTarget
    : {} & TTarget & TParams
  : TTarget
// Boxing is necessary to prevent distribution of conditional types:
// https://lorefnon.tech/2019/05/02/using-boxing-to-prevent-distribution-of-conditional-types/
type PartialOrAny<TBase, TKeys> = Boxed<TKeys> extends Boxed<never>
  ? {}
  : Boxed<TKeys> extends Boxed<keyof TBase>
    ? SafePick<TBase, TKeys & keyof TBase>
    : any
// Wrap a type in a container, making it an object type.
// This is primarily useful in circumventing special handling of union/intersection in typescript
interface Boxed<T> {
  _value: T
}
type SafePick<T, K extends keyof T> = T extends {} ? Pick<T, K> : any
// This is primarily to prevent type incompatibilities where target can be unknown.
// While unknown can be assigned to any, Partial<unknown> can't be.
type SafePartial<T> = Partial<AnyOrUnknownToOther<T, {}>>
type AnyOrUnknownToOther<T1, T2> = unknown extends T1 ? T2 : T1


type Any = DeferredKeySelection<any, any, any, any, any, any, any>

// Container type for situations when we want a partial/intersection eventually
// but the keys being selected or additional properties being augmented are not
// all known at once and we would want to effectively build up a partial/intersection
// over multiple steps.
interface DeferredKeySelection<
  // The base of selection. In intermediate stages this may be unknown.
  // If it remains unknown at the point of resolution, the selection will fall back to any
  TBase,
  // Union of keys to be selected
  // In intermediate stages this may be never.
  TKeys extends string,
  // Changes how the resolution should behave if TKeys is never.
  // If true, then we assume that some keys were selected, and if TKeys is never, we will fall back to any.
  // If false, and TKeys is never, then we select TBase in its entirety
  THasSelect extends true | false = false,
  // Mapping of aliases <key in result> -> <key in TBase>
  TAliasMapping extends {} = {},
  // If enabled, then instead of extracting a partial, during resolution
  // we will pick just a single property.
  TSingle extends boolean = false,
  // Extra props which will be intersected with the result
  TIntersectProps extends {} = {},
  // Extra props which will be unioned with the result
  TUnionProps = never
> {
  // These properties are not actually used, but exist simply because
  // typescript doesn't end up happy when type parameters are unused
  _base: TBase
  _hasSelection: THasSelect
  _keys: TKeys
  _aliases: TAliasMapping
  _single: TSingle
  _intersectProps: TIntersectProps
  _unionProps: TUnionProps
}


export declare namespace DeferredKeySelectionNS {

  // Replace the Base if already a deferred selection.
  // If not, create a new deferred selection with specified base.
  type SetBase<TSelection, TBase> = TSelection extends DeferredKeySelection<
  any,
  infer TKeys,
  infer THasSelect,
  infer TAliasMapping,
  infer TSingle,
  infer TIntersectProps,
  infer TUnionProps
  >
    ? DeferredKeySelection<
    TBase,
    TKeys,
    THasSelect,
    TAliasMapping,
    TSingle,
    TIntersectProps,
    TUnionProps
    >
    : DeferredKeySelection<TBase, never>

  // If TSelection is already a deferred selection, then replace the base with TBase
  // If unknown, create a new deferred selection with TBase as the base
  // Else, retain original
  //
  // For practical reasons applicable to current context, we always return arrays of
  // deferred selections. So, this particular operator may not be useful in generic contexts.
  type ReplaceBase<TSelection, TBase> =
    UnwrapArrayMember<TSelection> extends Any
      ? ArrayIfAlready<
      TSelection,
      SetBase<UnwrapArrayMember<TSelection>, TBase>
      >
      : unknown extends UnwrapArrayMember<TSelection>
        ? ArrayIfAlready<TSelection, SetBase<unknown, TBase>>
        : TSelection

  // Type operators to substitute individual type parameters:

  type SetSingle<
    TSelection,
    TSingle extends boolean
  > = TSelection extends DeferredKeySelection<
  infer TBase,
  infer TKeys,
  infer THasSelect,
  infer TAliasMapping,
  any,
  infer TIntersectProps,
  infer TUnionProps
  >
    ? DeferredKeySelection<
    TBase,
    TKeys,
    THasSelect,
    TAliasMapping,
    TSingle,
    TIntersectProps,
    TUnionProps
    >
    : never

  type AddKey<
    TSelection,
    TKey extends string
  > = TSelection extends DeferredKeySelection<
  infer TBase,
  infer TKeys,
  any,
  infer TAliasMapping,
  infer TSingle,
  infer TIntersectProps,
  infer TUnionProps
  >
    ? DeferredKeySelection<
    TBase,
    TKeys | TKey,
    true,
    TAliasMapping,
    TSingle,
    TIntersectProps,
    TUnionProps
    >
    : DeferredKeySelection<unknown, TKey, true>

  type AddAliases<
    TSelection,
    T extends {}
  > = TSelection extends DeferredKeySelection<
  infer TBase,
  infer TKeys,
  infer THasSelect,
  infer TAliasMapping,
  infer TSingle,
  infer TIntersectProps,
  infer TUnionProps
  >
    ? DeferredKeySelection<
    TBase,
    TKeys,
    THasSelect,
    TAliasMapping & T,
    TSingle,
    TIntersectProps,
    TUnionProps
    >
    : DeferredKeySelection<unknown, never, false, T>

  type AddUnionMember<TSelection, T> = TSelection extends DeferredKeySelection<
  infer TBase,
  infer TKeys,
  infer THasSelect,
  infer TAliasMapping,
  infer TSingle,
  infer TIntersectProps,
  infer TUnionProps
  >
    ? DeferredKeySelection<
    TBase,
    TKeys,
    THasSelect,
    TAliasMapping,
    TSingle,
    TIntersectProps,
    TUnionProps | T
    >
    : DeferredKeySelection<TSelection, never, false, {}, false, {}, T>

  // Convenience utility to set base, keys and aliases in a single type
  // application
  type Augment<
    T,
    TBase,
    TKey extends string,
    TAliasMapping extends {} = {}
  > = AddAliases<AddKey<SetBase<T, TBase>, TKey>, TAliasMapping>

  // Core resolution logic -- Refer to docs for DeferredKeySelection for specifics
  type ResolveOne<TSelection> = TSelection extends DeferredKeySelection<
  infer TBase,
  infer TKeys,
  infer THasSelect,
  infer TAliasMapping,
  infer TSingle,
  infer TIntersectProps,
  infer TUnionProps
  >
    ? UnknownOrCurlyCurlyToAny<
    // ^ We convert final result to any if it is unknown for backward compatibility.
    //   Historically knex typings have been liberal with returning any and changing
    //   default return type to unknown would be a major breaking change for users.
    //
    //   So we compromise on type safety here and return any.
    | AugmentParams<
    AnyToUnknown<TBase> extends {}
      ? // ^ Conversion of any -> unknown is needed here to prevent distribution
    //   of any over the conditional
      TSingle extends true
        ? TKeys extends keyof TBase
          ? TBase[TKeys]
          : any
        : AugmentParams<
        true extends THasSelect
          ? PartialOrAny<TBase, TKeys>
          : TBase,
        MappedAliasType<TBase, TAliasMapping>
        >
      : unknown,
    TIntersectProps
    >
    | TUnionProps
    >
    : TSelection

  type Resolve<TSelection> = TSelection extends Any
    ? Knex.ResolveTableType<ResolveOne<TSelection>>
    : TSelection extends Any[]
      ? Knex.ResolveTableType<ResolveOne<TSelection[0]>>[]
      : TSelection extends (infer I)[]
        ? UnknownOrCurlyCurlyToAny<Knex.ResolveTableType<I>>[]
        : UnknownOrCurlyCurlyToAny<Knex.ResolveTableType<TSelection>>
}

// If we have more categories of deferred selection in future,
// this will combine all of them
type ResolveResult<S, EnablePage extends boolean = false>
  = AddPagingMeta<DeferredKeySelectionNS.Resolve<S>, EnablePage>

type ComparisonOperator = '=' | '>' | '>=' | '<' | '<=' | '<>'

export interface Where<
  D extends {} = {},
  CaseConvert extends CaseType = CaseType,
  EnablePage extends boolean = false,
  TRecord extends {} = any,
  TResult = any
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
    TResultInner
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
  EnablePage extends boolean = false,
  TRecord extends {} = any,
  TResult = unknown[]
>
  extends Knex.RawQueryBuilder<TRecord, TResult> {
  (condition: boolean): KmoreQueryBuilder<D, CaseConvert, EnablePage, TRecord, TResult>
}

