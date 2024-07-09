/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */


export type ArrayIfAlready<T1, T2> = AnyToUnknown<T1> extends any[] ? T2[] : T2
// If T is an array, get the type of member, else fall back to never
export type ArrayMember<T> = T extends (infer M)[] ? M : never
export type AnyToUnknown<T> = unknown extends T ? unknown : T
export type CurlyCurlyToAny<T> = T extends unknown // distribute
  ? (<U>() => U extends T ? 0 : 1) extends <U>() => U extends {} ? 0 : 1
      ? any
      : T
  : never
export type Dict<T = any> = Record<string, T>
// If T can't be assigned to TBase fallback to an alternate type TAlt
export type IncompatibleToAlt<T, TBase, TAlt> = T extends TBase ? T : TAlt
// Retain the association of original keys with aliased keys at type level
// to facilitates type-safe aliasing for object syntax
export type MappedAliasType<TBase, TAliasMapping> = {} & {
  [K in keyof TAliasMapping]: TAliasMapping[K] extends keyof TBase
    ? TBase[TAliasMapping[K]]
    : any
}

export type UnknownOrCurlyCurlyToAny<T> = [UnknownToAny<T> | CurlyCurlyToAny<T>][0]
// If T is unknown then convert to any, else retain original
export type UnknownToAny<T> = unknown extends T ? any : T
// Intersection conditionally applied only when TParams is non-empty
// This is primarily to keep the signatures more intuitive.
export type AugmentParams<TTarget, TParams> = TParams extends {}
  ? keyof TParams extends never
    ? TTarget
    : {} & TTarget & TParams
  : TTarget
// Boxing is necessary to prevent distribution of conditional types:
// https://lorefnon.tech/2019/05/02/using-boxing-to-prevent-distribution-of-conditional-types/
export type PartialOrAny<TBase, TKeys> = Boxed<TKeys> extends Boxed<never>
  ? {}
  : Boxed<TKeys> extends Boxed<keyof TBase>
    ? SafePick<TBase, TKeys & keyof TBase>
    : any
// Wrap a type in a container, making it an object type.
// This is primarily useful in circumventing special handling of union/intersection in typescript
export interface Boxed<T> {
  _value: T
}
export type SafePick<T, K extends keyof T> = T extends {} ? Pick<T, K> : any
// This is primarily to prevent type incompatibilities where target can be unknown.
// While unknown can be assigned to any, Partial<unknown> can't be.
export type SafePartial<T> = Partial<AnyOrUnknownToOther<T, {}>>
export type AnyOrUnknownToOther<T1, T2> = unknown extends T1 ? T2 : T1


