/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import assert from 'node:assert'

import type { ScopeType } from '@mwcp/share'
import type { DbDict } from 'kmore-types'
import type { Knex } from 'knex'
// eslint-disable-next-line import/no-extraneous-dependencies, import/no-named-default
import { default as _knex } from 'knex'

import { createRefTables } from './builder/builder.index.js'
import type { DbQueryBuilder, KmoreQueryBuilder } from './builder/builder.types.js'
import { initialConfig } from './config.js'
import type { PostProcessInput } from './helper.js'
import { defaultWrapIdentifierIgnoreRule, postProcessResponse, wrapIdentifier } from './helper.js'
import { pagingPostProcessor, pagingPreProcessor, trxOnExceptionProcessor } from './processor/processor.index.js'
import { createTrxProxy } from './proxy/proxy.index.js'
import type { RowLockLevel, TrxPropagateOptions } from './trx.types.js'
import type {
  EventType,
  KmoreTransaction,
  KmoreTransactionConfig,
  KnexConfig,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryContext,
  TrxIdQueryMap,
  WrapIdentifierIgnoreRule,
} from './types.js'
import { CaseType } from './types.js'


export class Kmore<D extends object = any> {

  /**
   * Original table names, without case conversion.
   */
  readonly refTables: DbQueryBuilder<D, '', CaseType.none>

  /**
   * Create a table reference function property with camel case conversion.
   */
  readonly camelTables: DbQueryBuilder<D, '', CaseType.camel>

  // readonly pascalTables: DbQueryBuilder<D, '', CaseType.pascal>

  /**
   * Create a table reference function property with snake case conversion.
   */
  readonly snakeTables: DbQueryBuilder<D, '', CaseType.snake>

  /**
  * Generics parameter, do NOT access as variable!
  * Use under typescript development only.
  *
  * @example ```ts
  * const km = kmoreFactory<Db>({})
  * type DbModel = typeof km.DbModel
  * type Uid = DbModel['tb_user']['uid']  // equal to number
  * ```
  */
  readonly DbModel: D

  /**
  * Generics parameter, do NOT access as variable!
  * Use under typescript development only.
  *
  * @example ```ts
  * const km = kmoreFactory<Db>({})
  * type Dict = typeof kmore['Dict']
  * type Uid = Dict['columns']['tb_user']['alias']['tbUserUid'] // equal to literal 'tb_user.uid'
  * ```
  */
  readonly Dict: DbDict<D>

  readonly postProcessResponseSet = new Set<typeof postProcessResponse>()
  readonly trxActionOnError: KmoreTransactionConfig['trxActionOnError'] = 'rollback'
  /**
   * Map<scope, Set<trxId>>
   */
  protected readonly scopeTrxIdMap = new Map<ScopeType, Set<symbol>>()
  /**
   * Map<trxId, transaction>
   */
  protected readonly trxMap = new Map<symbol, KmoreTransaction>()
  /**
   * Map<trxId, Set<queryId>>
   */
  protected readonly trxIdQueryIdList: TrxIdQueryMap = new Map()

  readonly config: KnexConfig
  readonly dict: unknown extends D ? undefined : DbDict<D>
  readonly dbId: string
  readonly dbh: Knex
  readonly instanceId: string | symbol
  readonly eventCallbacks: EventCallbacks | undefined
  readonly wrapIdentifierCaseConvert: CaseType
  /**
   * Rules ignoring table identifier case conversion,
   * @docs https://knexjs.org/guide/#wrapidentifier
   */
  readonly wrapIdentifierIgnoreRule: WrapIdentifierIgnoreRule

  readonly builderPreProcessors: BuilderSyncProcessor[]
  /**
   * @default [pagingPreProcessor]
   */
  readonly builderPostProcessors: BuilderProcessor[]
  /**
   * @default [pagingPostProcessor]
   */
  readonly responsePreProcessors: ResponseProcessor[]
  /**
   * @default [trxOnExceptionProcessor]
   */
  readonly exceptionProcessors: ExceptionProcessor[]

  readonly transactionPostProcessors: TransactionProcessor[]

  constructor(options: KmoreFactoryOpts<D>) {
    const dbId = options.dbId ? options.dbId : Date.now().toString()
    this.dbId = dbId
    this.instanceId = options.instanceId ? options.instanceId : Symbol(`${dbId}-` + Date.now().toString())
    this.eventCallbacks = options.eventCallbacks

    const config: KnexConfig = {
      ...initialConfig,
      ...options.config,
    }
    config.pool = { ...initialConfig.pool, ...options.config.pool }
    this.config = config

    // assert(options.dict, 'options.dict must be defined')
    if (options.dict) {
      // @ts-expect-error
      this.dict = options.dict
    }
    else {
      console.info('Kmore:constructor() options.dict empty')
      // @ts-expect-error
      this.dict = void 0
    }

    this.builderPreProcessors = options.builderPreProcessors ?? []
    this.builderPostProcessors = options.builderPostProcessors ?? [pagingPreProcessor]
    this.responsePreProcessors = options.responsePreProcessors ?? [pagingPostProcessor]
    this.exceptionProcessors = options.exceptionHandlers ?? [trxOnExceptionProcessor]
    this.transactionPostProcessors = options.transactionPostProcessors ?? []

    /**
     * Table identifier case conversion,
     * If not CaseType.none, will ignore value of `KnexConfig['wrapIdentifier']`
     */
    this.wrapIdentifierCaseConvert = options.wrapIdentifierCaseConvert ?? CaseType.snake

    this.wrapIdentifierIgnoreRule = options.wrapIdentifierIgnoreRule ?? defaultWrapIdentifierIgnoreRule

    Reflect.apply(fnConstructor, this, [])

    if (options.trxActionOnError) {
      this.trxActionOnError = options.trxActionOnError
    }

    this.refTables = createRefTables<D, ''>(this, '', CaseType.none) as DbQueryBuilder<D, '', CaseType.none>
    this.camelTables = createRefTables<D, ''>(this, '', CaseType.camel) as DbQueryBuilder<D, '', CaseType.camel>
    // this.pascalTables = this.createRefTables<''>('', CaseType.pascal)
    this.snakeTables = createRefTables<D, ''>(this, '', CaseType.snake) as DbQueryBuilder<D, '', CaseType.snake>

    this.dbh = options.dbh ? options.dbh : createDbh(this.config)
  }

  // #region scopeTrxIdMap

  getTrxIdsByScope(scope: ScopeType): Set<symbol> | undefined {
    return this.scopeTrxIdMap.get(scope)
  }

  getTrxListByScope(scope: ScopeType): Set<KmoreTransaction> {
    const ret = new Set<KmoreTransaction>()
    assert(scope, 'scope must be defined')

    const trxIds = this.getTrxIdsByScope(scope)
    if (! trxIds?.size) {
      return ret
    }

    trxIds.forEach((trxId) => {
      const trx = this.trxMap.get(trxId)
      trx && ret.add(trx)
    })
    return ret
  }

  linkTrxIdToScope(kmoreTrxId: symbol, scope: ScopeType): void {
    assert(kmoreTrxId, 'kmoreTrxId must be defined')
    assert(scope, 'scope must be defined')

    let st = this.getTrxIdsByScope(scope)
    if (! st) {
      st = new Set()
      this.scopeTrxIdMap.set(scope, st)
    }
    st.has(kmoreTrxId) || st.add(kmoreTrxId)
  }

  unlinkTrxIdFromScope(trxId: symbol, scope: ScopeType | undefined): void {
    assert(trxId, 'trxId must be defined')
    if (scope) {
      const st = this.getTrxIdsByScope(scope)
      if (st) {
        st.delete(trxId)
      }
    }
    else {
      for (const st of this.scopeTrxIdMap.values()) {
        st.has(trxId) && st.delete(trxId)
      }
    }
  }

  // #region trxMap

  getTrxByTrxId(id: symbol): KmoreTransaction | undefined {
    return this.trxMap.get(id)
  }

  setTrx(trx: KmoreTransaction): void {
    const { kmoreTrxId } = trx
    assert(kmoreTrxId, 'kmoreTrxId must be defined')
    this.trxMap.set(kmoreTrxId, trx)
  }

  removeTrxByTrxId(trxId: symbol): void {
    this.trxMap.delete(trxId)
  }

  // #region trxIdQueryIdList

  getQueryIdListByTrxId(trxId: symbol): Set<symbol> | undefined {
    return this.trxIdQueryIdList.get(trxId)
  }

  linkQueryIdToTrxId(queryId: symbol, trxId: symbol): void {
    let st = this.getQueryIdListByTrxId(trxId)
    if (! st) {
      st = new Set()
      this.trxIdQueryIdList.set(trxId, st)
    }
    st.add(queryId)
  }

  unlinkQueryIdFromTrxId(queryId: symbol, trxId: symbol | undefined): void {
    if (trxId) {
      const st = this.getQueryIdListByTrxId(trxId)
      if (st) {
        st.delete(queryId)
      }
    }
    else {
      for (const st of this.trxIdQueryIdList.values()) {
        st.has(queryId) && st.delete(queryId)
      }
    }
  }

  removeTrxIdFromTrxIdQueryIdList(trxId: symbol): void {
    this.trxIdQueryIdList.delete(trxId)
  }

  getTrxByQueryId(queryId: symbol, scope?: ScopeType | undefined): KmoreTransaction | undefined {
    if (scope) {
      const st = this.getTrxIdsByScope(scope)
      if (st) {
        for (const trxId of st) {
          const st2 = this.getQueryIdListByTrxId(trxId)
          const found = st2?.has(queryId)
          if (found) {
            return this.getTrxByTrxId(trxId)
          }
        }
      }
    }

    for (const trxId of this.trxMap.keys()) {
      const st = this.getQueryIdListByTrxId(trxId)
      const found = st?.has(queryId)
      if (found) {
        return this.getTrxByTrxId(trxId)
      }
    }
  }

  removeTrxIdCache(trxId: symbol, scope: ScopeType | undefined): void {
    const trx = this.getTrxByTrxId(trxId)
    if (! trx) { return }
    trx.scope = void 0
    this.unlinkTrxIdFromScope(trxId, scope)
    this.removeTrxIdFromTrxIdQueryIdList(trxId)
    this.removeTrxByTrxId(trxId)
  }

  // #region transaction

  /**
   * Start a transaction.
   */
  async transaction(config?: KmoreTransactionConfig): Promise<KmoreTransaction> {

    const trx = await this.dbh.transaction(void 0, config) as KmoreTransaction
    let ret = createTrxProxy({
      kmore: this,
      config,
      transaction: trx,
      trxActionOnError: this.trxActionOnError,
      kmoreTrxId: void 0,
    })

    if (this.transactionPostProcessors.length) {
      for (const fn of this.transactionPostProcessors) {
        // eslint-disable-next-line no-await-in-loop
        const data = await fn({
          kmore: this,
          trx: ret,
          config,
        })
        ret = data.trx
      }
    }

    this.setTrx(ret)
    return ret
  }

  async finishTransaction(options: FinishTransactionOptions): Promise<void> {
    const { trx, action } = options
    if (! trx) { return }

    const op = action ?? trx.trxActionOnError
    switch (op) {
      case 'rollback': {
        await trx.rollback()
        break
      }

      case 'commit': {
        await trx.commit()
        break
      }

      default:
        break
    }
    // this.removeTrxIdCache(trx.kmoreTrxId, scope) // called by trx.rollback() or trx.commit()
  }


  destroy(): Promise<void> {
    return this.dbh.destroy()
  }

  async raw<T = unknown>(...args: unknown[]): Promise<T> {
    // @ts-expect-error
    return this.dbh.raw(...args)
  }

  builderClone(builder: KmoreQueryBuilder): KmoreQueryBuilder {
    const builder2 = builder.clone() as KmoreQueryBuilder
    return builder2
  }
  /* -------------- protected -------------- */


  protected postProcessResponse(
    result: any,
    queryContext?: QueryContext,
  ): unknown {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let ret = result
    for (const fn of this.postProcessResponseSet) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ret = fn(ret, queryContext)
    }
    return ret
  }

}

function fnConstructor(this: Kmore) {
  if (! this.config.wrapIdentifier) {
    if (this.wrapIdentifierCaseConvert === CaseType.none) {
      this.config.wrapIdentifier = defaultGlobalWrapIdentifier
    }
    else {
      this.config.wrapIdentifier = wrapIdentifier
    }
  }

  this.postProcessResponseSet.add(postProcessResponse)
  if (typeof this.config.postProcessResponse === 'function') {
    const fn = this.config.postProcessResponse
    this.postProcessResponseSet.add(fn)
  }
  delete this.config.postProcessResponse
  this.config.postProcessResponse = (
    result: PostProcessInput,
    queryContext?: QueryContext,
  ) => this.postProcessResponse(result, queryContext)
}


const fnKeys = [
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'ELS',
  'END',
]
function defaultGlobalWrapIdentifier(value: string, origImpl: (input: string) => string) {
  // const dem2 = '\''
  // original  IFNULL(user.distotal, 0) as foo
  // from: IFNULL(user => input: `IFNULL(user`  fix to IFNULL(user
  // from: distotal, 0) => input: `distotal, 0)` fix to distotal, 0)
  if (value.includes('(')) {
    return value
  }

  if (value.includes(')')) {
    return value
  }

  const upper = value.toUpperCase().trim()
  const matched = fnKeys.find(key => upper.includes(key))
  if (matched) {
    if (upper.startsWith('CASE ')) {
      return value
    }

    if (upper.endsWith(' END')) {
      return value
    }
  }

  const line = origImpl(value)
  if (value === '' && line === '``') {
    return '\'\''
  }
  return line
}


export function createDbh(knexConfig: KnexConfig): Knex {
  const inst = _knex.knex(knexConfig)
  return inst
}


export interface KmoreFactoryOpts<D> {
  config: KnexConfig
  dict?: DbDict<D>
  instanceId?: string | symbol
  dbh?: Knex
  dbId?: string
  /**
   * @docs https://knexjs.org/guide/interfaces.html#start
   * @docs https://knexjs.org/guide/interfaces.html#query
   * @docs https://knexjs.org/guide/interfaces.html#query-response
   */
  eventCallbacks?: EventCallbacks | undefined
  /**
   * Table identifier case conversion,
   * If not CaseType.none, will ignore value of `KnexConfig['wrapIdentifier']`
   * @default CaseType.snake
   * @docs https://knexjs.org/guide/#wrapidentifier
   */
  wrapIdentifierCaseConvert?: CaseType | undefined

  /**
   * Rules ignoring table identifier case conversion,
   * @docs https://knexjs.org/guide/#wrapidentifier
   */
  wrapIdentifierIgnoreRule?: WrapIdentifierIgnoreRule | undefined

  /**
   * Auto transaction action (rollback|commit|none) on error (Rejection or Exception),
   * @CAUTION **Will always rollback if query error in database even though this value set to 'commit'**
   * @default rollback
   */
  trxActionOnError?: KmoreTransactionConfig['trxActionOnError']
  builderPreProcessors?: BuilderSyncProcessor[] | undefined
  /**
   * @default [pagingPreProcessor]
   */
  builderPostProcessors?: BuilderProcessor[] | undefined
  /**
   * @default [pagingPostProcessor]
   */
  responsePreProcessors?: ResponseProcessor[] | undefined
  /**
   * @default [trxOnExceptionProcessor]
   */
  exceptionHandlers?: ExceptionProcessor[] | undefined

  /**
   * Run after creation of transaction when `transaction` method called
   */
  transactionPostProcessors?: TransactionProcessor[] | undefined
}

/**
 * @docs https://knexjs.org/guide/interfaces.html#query-response
 */
export type EventCallbackType = Exclude<EventType, 'unknown'>
/**
 * @docs https://knexjs.org/guide/interfaces.html#query-response
 */
export type EventCallbacks = Partial<EventCallbackList>
export interface EventCallbackList {
  start: (event: KmoreEvent, ctx?: Kmore) => void
  query: (event: KmoreEvent, ctx?: Kmore) => void
  queryResponse: (event: KmoreEvent, ctx?: Kmore) => void
  queryError: (event: KmoreEvent, ctx?: Kmore) => Promise<void>
  /**
   * Fire a single "end" event on the builder when
   * all queries have successfully completed.
   */
  // end: () => void
  /**
   * Triggered after event 'queryError'
   */
  // error: (ex: Error) => void
}
// export type EventCallbacks<Ctx = any> = Partial<Record<EventCallbackType, EventCallback<Ctx>>>

export interface KmoreEvent<T = unknown> {
  dbId: string
  type: EventType
  /** __knexUid */
  kUid: string
  /** __knexQueryUid */
  queryUid: string // 'mXxtvuJLHkZI816UZic57'
  kmoreQueryId: symbol
  /**
   * @description Note: may keep value of the latest transaction id,
   * even if no transaction this query!
   * __knexTxId
   *
   */
  trxId: string | undefined
  /** select, raw */
  method: string
  /** SELECT, DROP */
  command: string | undefined
  data: OnQueryData | undefined
  respRaw: OnQueryRespRaw<T> | undefined
  exData: OnQueryErrorData | undefined
  exError: OnQueryErrorErr | undefined
  queryBuilder: KmoreQueryBuilder | undefined // when event is 'start
  timestamp: number
}


export interface EventCallbackOptions<R = unknown> {
  ctx: Kmore
  event?: KmoreEvent<R>
}
/**
 * @docs https://knexjs.org/guide/interfaces.html#query-response
 */
// export type EventCallback<Ctx = any> = (event: KmoreEvent, ctx?: Ctx) => Promise<void>



export interface BuilderProcessorOptions {
  kmore: Kmore
  builder: KmoreQueryBuilder
}

export type BuilderSyncProcessor = (options: BuilderProcessorOptions) => BuilderProcessorOptions


/**
 * Run before the builder is executed (.then() is calling)
 * @returns builder as object key-value, avoid builder deferred execution when await builder
 */
export type BuilderProcessor = (options: BuilderProcessorOptions) => Promise<BuilderProcessorOptions>
/**
 * Run after the builder is executed (.then() is called)
 */
export type ResponseProcessor<T = unknown> = (options: ResponseProcessorOptions<T>) => Promise<T>

export type ExceptionProcessor = (options: ExceptionHandlerOptions) => Promise<never>

export interface ResponseProcessorOptions<Resp = unknown> {
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

export interface ExceptionHandlerOptions extends Omit<ResponseProcessorOptions, 'response'> {
  exception: Error
}

export interface TransactionProcessorOptions {
  kmore: Kmore
  trx: KmoreTransaction
  config: KmoreTransactionConfig | undefined
}
export type TransactionProcessor = (options: TransactionProcessorOptions) => Promise<TransactionProcessorOptions>

export interface CreateProxyThenOptions {
  kmore: Kmore
  builder: KmoreQueryBuilder
}
export type ProxyThenRunnerOptions = CreateProxyThenOptions & ProxyRunnerExtraOptions

export interface CreateProxyTrxOptions {
  kmore: Kmore
  config: KmoreTransactionConfig | undefined
  transaction: KmoreTransaction
  /**
   * Use it if defined
   */
  trxActionOnError: KmoreTransactionConfig['trxActionOnError']
  /**
   * Use it if is symbol, otherwise call genKmoreTrxId()
   */
  kmoreTrxId: symbol | undefined
}
export type ProxyCommitRunnerOptions = CreateProxyTrxOptions & { args: unknown[] }

export interface ProxyRunnerExtraOptions {
  done: undefined | ((data: unknown) => unknown) // valid when chain next then()
  reject: undefined | ((data: unknown) => Error) // valid when chain next then()
  transaction?: KmoreTransaction | undefined
}


export interface PagerOptions {
  kmore: Kmore
  builder: KmoreQueryBuilder
}

export interface FinishTransactionOptions {
  trx: KmoreTransaction | undefined
  action?: 'commit' | 'rollback'
  scope?: ScopeType | undefined
}
