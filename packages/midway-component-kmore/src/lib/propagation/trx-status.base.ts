/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { TraceService } from '@mwcp/otel'
import { CallerInfo } from '@waiting/shared-core'
import {
  Kmore,
  KmoreQueryBuilder,
  KmoreTransaction,
  KmoreTransactionConfig,
  PropagationType,
  RowLockLevel,
  TrxPropagateOptions,
} from 'kmore'

import { DbSourceManager } from '../db-source-manager.js'


/**
 * Declaritive transaction status manager
 */
export abstract class TrxStatusServiceBase {

  abstract readonly appDir: string
  abstract readonly traceSvc: TraceService
  abstract readonly dbSourceManager: DbSourceManager

  protected abstract readonly callerKeyFileMap: CallerKeyFileMap
  protected abstract readonly callerKeyPropagationMap: CallerKeyPropagationMap
  protected abstract readonly dbIdTrxIdMap: Map<string, symbol[]>
  protected abstract readonly entryCallerKeyTrxMap: EntryCallerKeyTrxMap
  protected abstract readonly callerTreeMap: CallerTreeMap

  abstract getName(): string

  abstract registerPropagation(options: RegisterTrxPropagateOptions): CallerKey

  abstract retrieveTopCallerKeyFromCallStack(): CallerKey | undefined

  abstract retrieveFirstAncestorCallerKeyByCallerKey(key: CallerKey): CallerKey | undefined
  abstract retrieveTopCallerKeyArrayByCallerKey(key: CallerKey): CallerKey[]
  abstract retrieveUniqueTopCallerKey(key: CallerKey): CallerKey | undefined

  abstract isRegistered(key: CallerKey): boolean

  abstract bindBuilderPropagationData(builder: KmoreQueryBuilder, distance: number): KmoreQueryBuilder

  abstract propagating(options: PropagatingOptions): Promise<PropagatingRet>
  abstract trxCommitIfEntryTop(callerKey: CallerKey): Promise<void>
  abstract trxRollbackEntry(callerKey: CallerKey): Promise<void>

  abstract retrieveCallerInfo(distance: number): CallerInfo

  abstract pickActiveTrx(db: Kmore): KmoreTransaction | undefined

  abstract startNewTrx(db: Kmore, callerKey: CallerKey): Promise<KmoreTransaction>

  abstract getPropagationOptions(key: CallerKey): RegisterTrxPropagateOptions | undefined

}


export interface PropagatingOptions {
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

export type CallerKeyFileMap = Map<CallerKey, FilePath>
export type CallerKeyPropagationMap = Map<CallerKey, RegisterTrxPropagateOptions>
export type EntryCallerKeyTrxMap = Map<CallerKey, KmoreTransaction[]>
export type CallerTreeMap = Map<CallerKey, CallerKeyArray>

// type CallerKeySet = Set<CallerKey>
export type CallerKeyArray = CallerKey[]

export type RegId = symbol

export interface TraceEndOptions {
  kmoreTrxId: symbol
  op: KmoreTransactionConfig['trxActionOnEnd']
  trxPropagateOptions: TrxPropagateOptions | undefined
}


export type CallerKey = `${ClassName}:${FuncName}`
export type ClassName = string
export type MethodName = string
export type FuncName = string
export type FilePath = string

export interface RegisterTrxPropagateOptions {
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

