/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CtxExceptionHandler,
  KmoreQueryBuilder,
} from './builder.types.js'
import type { RowLockLevel, TrxPropagateOptions } from './trx.types.js'
import type {
  CaseType,
  EventCallbacks,
  KmoreTransaction,
  KmoreTransactionConfig,
  QueryContext,
  TrxIdQueryMap,
  WrapIdentifierIgnoreRule,
} from './types.js'


export abstract class KmoreBase<Context = any> {

  readonly abstract dict: unknown
  readonly abstract dbId: string
  readonly abstract eventCallbacks: EventCallbacks<Context> | undefined
  readonly abstract instanceId: string | symbol
  readonly abstract wrapIdentifierCaseConvert: CaseType
  /**
   * Rules ignoring table identifier case conversion,
   */
  readonly abstract wrapIdentifierIgnoreRule: WrapIdentifierIgnoreRule

  /**
   * kmoreTrxId => Set(kmoreQueryId)
   */
  readonly abstract trxIdQueryMap: TrxIdQueryMap

  /**
   * kmoreTrxId => trx
   */
  readonly abstract trxMap: Map<symbol, KmoreTransaction>

  readonly abstract DbModel: any

  readonly abstract builderPreProcessors: BuilderPreProcessor[]
  readonly abstract responsePreProcessors: ResponsePreProcessor[]

  /**
   * Start a transaction.
   * @param id - For generation of kmoreTrxId
   */
  abstract transaction(config?: KmoreTransactionConfig): Promise<KmoreTransaction>

  abstract getTrxByKmoreQueryId(kmoreQueryId: symbol): KmoreTransaction | undefined

  abstract getTrxByKmoreTrxId(id: symbol): KmoreTransaction | undefined

  abstract setCtxTrxIdMap(
    ctx: unknown,
    kmoreTrxId: symbol,
  ): void

  abstract getTrxSetByCtx(
    ctx: unknown,
  ): Set<KmoreTransaction>

  abstract finishTransaction(trx: KmoreTransaction | undefined): Promise<void>

  abstract destroy(): Promise<void>

  abstract raw<T = unknown>(...args: unknown[]): Promise<T>

  /**
   * Save a trx point and return a new trx.
   */
  // abstract trxSavepoint(trx: KmoreTransaction): Promise<KmoreTransaction>

  /* -------------- protected -------------- */

  protected abstract postProcessResponse(
    result: any,
    queryContext?: QueryContext,
  ): unknown

}

export interface CreateQueryBuilderGetProxyOptions {
  kmore: KmoreBase
  builder: KmoreQueryBuilder
  thenHandler: (options: ProxyGetHandlerOptions) => KmoreQueryBuilder['then']
  ctxExceptionHandler: CtxExceptionHandler | undefined
}

export interface ProxyGetHandlerOptions {
  kmore: KmoreBase
  builder: KmoreQueryBuilder
  propKey: string | symbol
  ctxExceptionHandler: CtxExceptionHandler | undefined
}
export interface PagerOptions {
  kmore: KmoreBase
  builder: KmoreQueryBuilder
  ctxExceptionHandler: CtxExceptionHandler | undefined
}


export interface BuilderPreProcessorOptions {
  kmore: KmoreBase
  builder: KmoreQueryBuilder
}

/**
 * Run before the builder is executed (.then() is calling)
 * @returns builder as object key-value, avoid builder deferred execution when await builder
 */
export type BuilderPreProcessor = (options: BuilderPreProcessorOptions) => Promise<BuilderPreProcessorOptions>
/**
 * Run after the builder is executed (.then() is called)
 */
export type ResponsePreProcessor<T = unknown> = (options: ResponsePreProcessorOptions<T>) => Promise<T>

export type ExceptionHandler = (options: ExceptionHandlerOptions) => Promise<never>

export interface ResponsePreProcessorOptions<Resp = unknown> {
  kmore: KmoreBase
  builder: KmoreQueryBuilder
  kmoreQueryId: symbol
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

export interface ExceptionHandlerOptions extends Omit<ResponsePreProcessorOptions, 'response'> {
  exception: unknown
}

