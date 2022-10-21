/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CaseType,
  DbQueryBuilder,
  KmoreQueryBuilder,
  KmoreTransaction,
  KmoreTransactionConfig,
  QueryContext,
} from './types.js'


export abstract class KmoreBase<D = any, Context = any> {

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

  protected abstract createTrxProxy(trx: KmoreTransaction): KmoreTransaction

  protected abstract createRefTables<P extends string>(
    prefix: P,
    caseConvert: CaseType,
  ): DbQueryBuilder<Context, D, P, CaseType>

  protected abstract extRefTableFnProperty(
    refName: string,
    caseConvert: CaseType,
    ctx: Context | object,
  ): KmoreQueryBuilder

  protected abstract extRefTableFnPropertyCallback(
    refTable: KmoreQueryBuilder,
    caseConvert: CaseType,
    ctx: Context | object,
    kmoreQueryId: symbol,
  ): KmoreQueryBuilder

  protected abstract extRefTableFnPropertyTransacting(
    refTable: KmoreQueryBuilder,
    ctx: Context | object,
  ): KmoreQueryBuilder

  protected abstract postProcessResponse(
    result: any,
    queryContext?: QueryContext,
  ): unknown

  /**
   * Create a proxy for `then` method on QueryBuilder, not on QueryResponse
   */
  protected abstract proxyGetThen(options: ProxyGetOptions): KmoreQueryBuilder['then']

}

export interface ProxyGetOptions {
  kmore: KmoreBase
  target: KmoreQueryBuilder
  propKey: string | symbol
  receiver: unknown
}

