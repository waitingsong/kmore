/* eslint-disable @typescript-eslint/no-explicit-any */
import { KmoreQueryBuilder, PageRawType, PageWrapType } from './builder.types.js'
import {
  CaseType,
  EventCallbacks,
  KmoreTransaction,
  KmoreTransactionConfig,
  QueryContext,
  TrxIdQueryMap,
} from './types.js'


export abstract class KmoreBase<Context = any> {

  readonly abstract dict: unknown
  readonly abstract dbId: string
  readonly abstract eventCallbacks: EventCallbacks<Context> | undefined
  readonly abstract instanceId: string | symbol
  readonly abstract wrapIdentifierCaseConvert: CaseType

  /**
   * kmoreTrxId => Set(kmoreQueryId)
   */
  readonly abstract trxIdQueryMap: TrxIdQueryMap

  /**
   * kmoreTrxId => trx
   */
  readonly abstract trxMap: Map<symbol, KmoreTransaction>

  readonly abstract DbModel: any

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
  resultPagerHandler?: ResultPagerHandler | undefined
}

export interface ProxyGetHandlerOptions {
  kmore: KmoreBase
  target: KmoreQueryBuilder
  propKey: string | symbol
  receiver: unknown
  resultPagerHandler?: ResultPagerHandler | undefined
}
export interface PagerOptions {
  kmore: KmoreBase
  builder: KmoreQueryBuilder
}

type ResultPagerHandler<T = unknown> = (
  options: PagerOptions,
  proxyCreator: (options: CreateQueryBuilderGetProxyOptions) => KmoreQueryBuilder,
) => Promise<PageRawType<T> | PageWrapType<T> | undefined>

