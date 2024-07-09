/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { UnwrapArrayMember } from '@waiting/shared-types'
import type { Knex } from 'knex'

import type {
  AnyToUnknown,
  ArrayIfAlready,
  AugmentParams,
  MappedAliasType,
  PartialOrAny,
  UnknownOrCurlyCurlyToAny,
} from './knex.types.js'


type Any = DeferredKeySelection<any, any, any, any, any, any, any>

// Container type for situations when we want a partial/intersection eventually
// but the keys being selected or additional properties being augmented are not
// all known at once and we would want to effectively build up a partial/intersection
// over multiple steps.
export interface DeferredKeySelection<
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
  TUnionProps = never,
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


// #region namespace DeferredKeySelectionNS

// Replace the Base if already a deferred selection.
// If not, create a new deferred selection with specified base.
export type SetBase<TSelection, TBase> = TSelection extends DeferredKeySelection<
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
export type ReplaceBase<TSelection, TBase> =
    UnwrapArrayMember<TSelection> extends Any
      ? ArrayIfAlready<
        TSelection,
        SetBase<UnwrapArrayMember<TSelection>, TBase>
      >
      : unknown extends UnwrapArrayMember<TSelection>
        ? ArrayIfAlready<TSelection, SetBase<unknown, TBase>>
        : TSelection

// Type operators to substitute individual type parameters:

export type SetSingle<
  TSelection,
  TSingle extends boolean,
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

export type AddKey<
  TSelection,
  TKey extends string,
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

export type AddAliases<
  TSelection,
  T extends {},
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

export type AddUnionMember<TSelection, T> = TSelection extends DeferredKeySelection<
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
export type Augment<
  T,
  TBase,
  TKey extends string,
  TAliasMapping extends {} = {},
> = AddAliases<AddKey<SetBase<T, TBase>, TKey>, TAliasMapping>

// Core resolution logic -- Refer to docs for DeferredKeySelection for specifics
export type ResolveOne<TSelection> = TSelection extends DeferredKeySelection<
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

export type Resolve<TSelection> = TSelection extends Any
  ? Knex.ResolveTableType<ResolveOne<TSelection>>
  : TSelection extends Any[]
    ? Knex.ResolveTableType<ResolveOne<TSelection[0]>>[]
    : TSelection extends (infer I)[]
      ? UnknownOrCurlyCurlyToAny<Knex.ResolveTableType<I>>[]
      : UnknownOrCurlyCurlyToAny<Knex.ResolveTableType<TSelection>>

