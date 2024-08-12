import type { Kmore, KmoreQueryBuilder, KmoreTransaction, KmoreTransactionConfig } from '##/lib/index.js'

import type { RowLockLevel, TrxPropagateOptions } from '../trx.types.js'


export interface HookList {
  builderPreHooks: BuilderSyncHook[]
  /**
   * @default [pagingPreProcessor]
   */
  builderPostHooks: BuilderHook[]
  /**
   * @default [pagingPostProcessor]
   */
  responsePreHooks: ResponseHook[]
  /**
   * @default [trxOnExceptionProcessor]
   */
  exceptionHooks: ExceptionHook[]
  /**
   * Run before creation of transaction when `transaction` method called
   */
  transactionPreHooks: TransactionPreHook[]
  /**
   * Run after creation of transaction when `transaction` method called
   */
  transactionPostHooks: TransactionPostHook[]

  beforeCommitHooks: TrxCommitRollbackHook[]
  afterCommitHooks: TrxCommitRollbackHook[]

  beforeRollbackHooks: TrxCommitRollbackHook[]
  afterRollbackHooks: TrxCommitRollbackHook[]
}

export interface BuilderHookOptions {
  kmore: Kmore
  builder: KmoreQueryBuilder
}
export type BuilderSyncHook = (options: BuilderHookOptions) => BuilderHookOptions

/**
 * Run before the builder is executed (.then() is calling)
 * @returns builder as object key-value, avoid builder deferred execution when await builder
 */
export type BuilderHook = (options: BuilderHookOptions) => Promise<BuilderHookOptions>
/**
 * Run after the builder is executed (.then() is called)
 */
export type ResponseHook<T = unknown> = (options: ResponseHookOptions<T>) => Promise<T>

export type ExceptionHook = (options: ExceptionHookOptions) => Promise<never>

export interface ResponseHookOptions<Resp = unknown> {
  kmore: Kmore
  builder: KmoreQueryBuilder
  kmoreTrxId: symbol | undefined
  response: Resp
  transactionalProcessed: boolean | undefined
  trxPropagateOptions: TrxPropagateOptions | undefined
  trxPropagated: boolean | undefined
  /**
   * Propagation rowlock level
   * @default {@link RowLockLevel}
   */
  rowLockLevel: RowLockLevel | undefined
}

export interface ExceptionHookOptions extends Omit<ResponseHookOptions, 'response'> {
  exception: Error
}

// #region transaction

export interface TransactionPreHookOptions {
  kmore: Kmore
  config: KmoreTransactionConfig
}
export type TransactionPreHook = (options: TransactionPreHookOptions) => Promise<TransactionPreHookOptions>

export interface TransactionHookOptions {
  kmore: Kmore
  config: KmoreTransactionConfig
  trx: KmoreTransaction
}
export type TransactionPostHook = (options: TransactionHookOptions) => Promise<TransactionHookOptions>
/**
 * Run before/after commit or rollback
 */
export type TrxCommitRollbackHook = (options: TransactionHookOptions) => Promise<TransactionHookOptions>

