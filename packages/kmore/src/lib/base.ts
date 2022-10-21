/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CaseType,
  EventCallbacks,
  KmoreQueryBuilder,
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
   * kmoreTrxId => Set<kmoreQueryId>
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
  abstract transaction(
    id?: PropertyKey,
    config?: KmoreTransactionConfig,
  ): Promise<KmoreTransaction>

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

  /* -------------- protected -------------- */

  protected abstract postProcessResponse(
    result: any,
    queryContext?: QueryContext,
  ): unknown

}

export interface ProxyGetOptions {
  kmore: KmoreBase
  target: KmoreQueryBuilder
  propKey: string | symbol
  receiver: unknown
}

