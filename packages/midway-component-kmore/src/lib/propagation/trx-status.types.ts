import type { ScopeType } from '@mwcp/share'
import type {
  Kmore,
  KmoreQueryBuilder,
  KmoreTransaction,
  KmoreTransactionConfig,
  PropagationType,
  RowLockLevel,
  TrxPropagateOptions,
} from 'kmore'


export interface StartNewTrxOptions extends KmoreTransactionConfig {
  db: Kmore
  scope: ScopeType
  trxPropagateOptions: TrxPropagateOptions
  kmoreTrxId?: symbol | undefined
}

export interface PropagatingOptions {
  builder: KmoreQueryBuilder
  db: Kmore
}
export interface PropagatingRet {
  /**
   * undefined if propagated already, trx present
   */
  kmoreTrxId: symbol | undefined
}

export type DbSourceName = string

export type CallerKeyFileMapIndex = Map<ScopeType, SourceCallerKeyFileMap>
type SourceCallerKeyFileMap = Map<DbSourceName, CallerKeyFileMap>
type CallerKeyFileMap = Map<CallerKey, FilePath>

export type CallerKeyPropagationMapIndex = Map<ScopeType, SourceCallerKeyPropagationMap>
type SourceCallerKeyPropagationMap = Map<DbSourceName, CallerKeyPropagationMap>
type CallerKeyPropagationMap = Map<CallerKey, RegisterTrxPropagateOptions>

export type EntryCallerKeyTrxMapIndex = Map<ScopeType, SourceCallerKeyTrxMap>
type SourceCallerKeyTrxMap = Map<DbSourceName, CallerKeyTrxArrayMap>
type CallerKeyTrxArrayMap = Map<CallerKey, KmoreTransaction[]>

export type CallerTreeMapIndex = Map<ScopeType, SourceCallerTreeMap>
type SourceCallerTreeMap = Map<DbSourceName, CallerTreeMap>
type CallerTreeMap = Map<CallerKey, CallerKeyArray>

// type CallerKeySet = Set<CallerKey>
export type CallerKeyArray = CallerKey[]

export type RegId = symbol

// export interface TraceEndOptions {
//   kmoreTrxId: symbol
//   op: KmoreTransactionConfig['trxActionOnError']
//   trxPropagateOptions: TrxPropagateOptions | undefined
//   span: Span | undefined | false
// }


/**
 * CallerKey: `${ClassName}:${FuncName}`
 */
export type CallerKey = string
export type ClassName = string
export type MethodName = string
export type FuncName = string
export type FilePath = string

export interface RegisterTrxPropagateOptions {
  dbSourceName: DbSourceName | undefined
  scope: ScopeType
  type: PropagationType
  className: string
  funcName: string
  /**
   * @default {@link RowLockLevel.ForShare}
   */
  readRowLockLevel: RowLockLevel
  /**
   * @default {@link RowLockLevel.ForUpdate}
   */
  writeRowLockLevel: RowLockLevel
}

export interface TrxCallerInfo {
  path: FilePath
  className: ClassName
  funcName: FuncName
  methodName: MethodName
  line: number
  column: number
}
export enum TransactionalEntryType {
  top = 'top',
  sub = 'sub',
  savepoint = 'savepoint',
}

