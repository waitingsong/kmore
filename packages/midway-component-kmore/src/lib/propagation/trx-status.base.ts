/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { TraceService, Span } from '@mwcp/otel'
import type { ScopeType } from '@mwcp/share'
import type { CallerInfo } from '@waiting/shared-core'
import type {
  Kmore,
  KmoreQueryBuilder,
  KmoreTransaction,
  KmoreTransactionConfig,
  PropagationType,
  RowLockLevel,
  TrxPropagateOptions,
} from 'kmore'

import type { AbstractDbSourceManager } from '../db-source-manager-base.js'


/**
 * Declarative transaction status manager
 */
export abstract class TrxStatusServiceBase {

  abstract readonly appDir: string
  abstract readonly traceSvc: TraceService

  abstract getName(): string

  abstract registerPropagation(options: RegisterTrxPropagateOptions): CallerKey

  abstract retrieveTopCallerKeyFromCallStack(dbSourceName: DbSourceName, scope: ScopeType, limit?: number): CallerKey | undefined

  abstract retrieveTopCallerKeyArrayByCallerKey(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): CallerKey[]
  abstract retrieveUniqueTopCallerKey(dbSourceName: DbSourceName | undefined, scope: ScopeType, key: CallerKey): CallerKey | undefined

  abstract isRegistered(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): boolean

  // abstract bindBuilderPropagationData(
  //   dbSourceName: DbSourceName,
  //   scope: ScopeType,
  //   builder: KmoreQueryBuilder,
  //   distance: number,
  // ): void

  abstract propagating(options: PropagatingOptions): Promise<PropagatingRet>
  abstract tryCommitTrxIfKeyIsEntryTop(dbSourceName: DbSourceName | undefined, scope: ScopeType, callerKey: CallerKey): Promise<void>
  abstract trxRollbackEntry(dbSourceName: DbSourceName | undefined, scope: ScopeType, callerKey: CallerKey): Promise<void>

  abstract retrieveCallerInfo(distance: number): CallerInfo

  abstract pickActiveTrx(scope: ScopeType, db: Kmore): KmoreTransaction | undefined

  abstract startNewTrx(scope: ScopeType, db: Kmore, callerKey: CallerKey): Promise<KmoreTransaction>

  // abstract getPropagationOptions(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): RegisterTrxPropagateOptions | undefined
  // abstract setPropagationOptions(dbSourceName: DbSourceName, key: CallerKey, options: RegisterTrxPropagateOptions): void

  // @FIXME
  // abstract getTrxRootSpan(trx: symbol | object): Span | undefined
  // abstract setTrxRootSpan(trx: symbol | object, span: Span): void
  // abstract delTrxRootSpan(trx: symbol | object): void

  abstract cleanAfterRequestFinished(scope: ScopeType): void
}


export interface PropagatingOptions {
  builder: KmoreQueryBuilder
  db: Kmore
  dbSourceManager: AbstractDbSourceManager
  scope: ScopeType
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

export type EntryCallerKeyTrxMapIndex = Map<ScopeType, EntryCallerKeyTrxMap>
export type EntryCallerKeyTrxMap = Map<CallerKey, KmoreTransaction[]>

export type CallerTreeMapIndex = Map<ScopeType, SourceCallerTreeMap>
type SourceCallerTreeMap = Map<DbSourceName, CallerTreeMap>
type CallerTreeMap = Map<CallerKey, CallerKeyArray>


export type TrxIdMapIndex = Map<ScopeType, DbIdTrxIdMap>
type DbIdTrxIdMap = Map<DbSourceName, symbol[]>

// type CallerKeySet = Set<CallerKey>
export type CallerKeyArray = CallerKey[]

export type RegId = symbol

export interface TraceEndOptions {
  kmoreTrxId: symbol
  op: KmoreTransactionConfig['trxActionOnError']
  trxPropagateOptions: TrxPropagateOptions | undefined
  span: Span | undefined | false
}


export type CallerKey = `${ClassName}:${FuncName}`
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

