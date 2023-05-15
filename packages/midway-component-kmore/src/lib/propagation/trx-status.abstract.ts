/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { AbstractOtelComponent, Span } from '@mwcp/otel'
import type { Application, Context } from '@mwcp/share'
import { CallerInfo } from '@waiting/shared-core'
import {
  Kmore,
  KmoreQueryBuilder,
  KmoreTransaction,
  KmoreTransactionConfig,
  PropagationType,
  RowLockLevel,
  TrxPropagateOptions as KmoreTrxPropagateOptions,
} from 'kmore'

import { DbSourceManager } from '../db-source-manager'


export type TrxPropagateOptions = KmoreTrxPropagateOptions


/**
 * Declaritive transaction status manager
 */
export abstract class AbstractTrxStatusService {

  abstract readonly appDir: string
  abstract readonly otel: AbstractOtelComponent
  abstract readonly dbSourceManager: DbSourceManager

  protected abstract readonly callerKeyFileMapIndex: CallerKeyFileMapIndex
  protected abstract readonly callerKeyPropagationMapIndex: CallerKeyPropagationMapIndex
  protected abstract readonly dbIdTrxIdMapIndex: DbIdTrxIdMapIndex
  protected abstract readonly entryCallerKeyTrxMapIndex: EntryCallerKeyTrxMapIndex
  protected abstract readonly callerTreeMapIndex: CallerTreeMapIndex
  protected abstract readonly trxRootSpanWeakMap: WeakMap<RegisterTrxContext, Span>

  abstract getName(): string

  abstract registerPropagation(options: RegisterTrxPropagateOptions): CallerKey

  abstract retrieveTopCallerKeyFromCallStack(regContext: RegisterTrxContext, limit?: number): CallerKey | undefined

  abstract retrieveFirstAncestorCallerKeyByCallerKey(
    regContext: RegisterTrxContext,
    key: CallerKey,
  ): CallerKey | undefined

  abstract retrieveTopCallerKeyArrayByCallerKey(regContext: RegisterTrxContext, key: CallerKey): CallerKey[]
  abstract retrieveUniqueTopCallerKey(regContext: RegisterTrxContext, key: CallerKey): CallerKey | undefined

  abstract isRegistered(regContext: RegisterTrxContext, key: CallerKey): boolean

  abstract bindBuilderPropagationData(
    regContext: RegisterTrxContext,
    builder: KmoreQueryBuilder,
    distance: number,
  ): KmoreQueryBuilder

  abstract propagating(options: PropagatingOptions): Promise<PropagatingRet>
  abstract trxCommitIfEntryTop(regContext: RegisterTrxContext, callerKey: CallerKey): Promise<void>
  abstract trxRollbackEntry(regContext: RegisterTrxContext, callerKey: CallerKey): Promise<void>

  abstract retrieveCallerInfo(distance: number): CallerInfo

  abstract pickActiveTrx(regContext: RegisterTrxContext, db: Kmore): KmoreTransaction | undefined

  abstract startNewTrx(regContext: RegisterTrxContext, db: Kmore, callerKey: CallerKey): Promise<KmoreTransaction>

  abstract getPropagationOptions(regContext: RegisterTrxContext, key: CallerKey): RegisterTrxPropagateOptions| undefined

  abstract setPropagationOptions(key: CallerKey, options: RegisterTrxPropagateOptions): void

  abstract getTrxRootSpan(regContext: RegisterTrxContext): Span | undefined
  abstract setTrxRootSpan(regContext: RegisterTrxContext, span: Span): void
  abstract delTrxRootSpan(regContext: RegisterTrxContext): void

  abstract cleanAfterRequestFinished(regContext: RegisterTrxContext): void
}


export interface PropagatingOptions {
  regContext: RegisterTrxContext
  db: Kmore
  builder: KmoreQueryBuilder
}
export interface PropagatingRet {
  builder: KmoreQueryBuilder
  /**
   * undefined if propagated already, trx present
   */
  kmoreTrxId: symbol | undefined
}

export type CallerKeyFileMapIndex = Map<RegisterTrxContext, CallerKeyFileMap>
export type CallerKeyFileMap = Map<CallerKey, FilePath>

export type CallerKeyPropagationMapIndex = Map<RegisterTrxContext, CallerKeyPropagationMap>
export type CallerKeyPropagationMap = Map<CallerKey, RegisterTrxPropagateOptions>

export type EntryCallerKeyTrxMapIndex = Map<RegisterTrxContext, EntryCallerKeyTrxMap>
export type EntryCallerKeyTrxMap = Map<CallerKey, KmoreTransaction[]>

export type CallerTreeMapIndex = Map<RegisterTrxContext, CallerTreeMap>
export type CallerTreeMap = Map<CallerKey, CallerKeyArray>

export type DbIdTrxIdMapIndex = Map<RegisterTrxContext, DbIdTrxIdMap>
export type DbIdTrxIdMap = Map<string, symbol[]>

// type CallerKeySet = Set<CallerKey>
export type CallerKeyArray = CallerKey[]

export type RegId = symbol

export interface TraceEndOptions {
  kmoreTrxId: symbol
  op: KmoreTransactionConfig['trxActionOnEnd']
  trxPropagateOptions: TrxPropagateOptions | undefined
  span: Span | undefined | false
}


export type CallerKey = `${ClassName}:${FuncName}`
export type ClassName = string
export type MethodName = string
export type FuncName = string
export type FilePath = string
/**
 * WebContext for request, Appliation for singletons
 */
export type RegisterTrxContext = Context | Application

export interface RegisterTrxPropagateOptions {
  /**
   * WebContext for request, symbol for singletons
   */
  regContext: RegisterTrxContext
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
  /**
   * No trace if undefined or false
   */
  span: Span | undefined | false
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

