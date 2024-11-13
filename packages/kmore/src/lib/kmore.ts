/* eslint-disable @typescript-eslint/no-invalid-void-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import assert from 'node:assert'

import type { TraceContext } from '@mwcp/otel'
import type { ScopeType } from '@mwcp/share'
import { context } from '@opentelemetry/api'
import type { DbDict } from 'kmore-types'
import type { Knex } from 'knex'
import _knex from 'knex'

import { createRefTables } from './builder/builder.index.js'
import type { DbQueryBuilder, KmoreQueryBuilder } from './builder/builder.types.js'
import { initialConfig } from './config.js'
import type { PostProcessInput } from './helper.js'
import { defaultWrapIdentifierIgnoreRule, postProcessResponse, wrapIdentifier } from './helper.js'
import { genHookList } from './hook/hook.helper.js'
import type { HookList, HookReturn, TransactionHookOptions, TransactionPreHookOptions } from './hook/hook.types.js'
import { createTrxProxy } from './proxy/proxy.index.js'
import { TrxControl } from './trx.types.js'
import type {
  EventType,
  KmoreTransaction,
  KmoreTransactionConfig,
  KnexConfig,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
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
  readonly trxActionOnError: KmoreTransactionConfig['trxActionOnError'] = TrxControl.Rollback
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

  readonly hookList: HookList
  enableTrace = false

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

    this.hookList = genHookList(options.hookList)
    this.enableTrace = !! options.enableTrace

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

  getTrxByQueryId(queryId: symbol, scope?: ScopeType): KmoreTransaction | undefined {
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
    this.unlinkTrxIdFromScope(trxId, scope)
    this.removeTrxIdFromTrxIdQueryIdList(trxId)
    this.removeTrxByTrxId(trxId)
  }

  // #region transaction

  /**
   * Start a transaction.
   */
  async transaction(config?: KmoreTransactionConfig): Promise<KmoreTransaction> {
    if (this.enableTrace) {
      return context.with(context.active(), () => this._transaction(config))
    }
    return this._transaction(config)
  }

  async _transaction(config?: KmoreTransactionConfig): Promise<KmoreTransaction> {
    const config2 = Object.assign({ trxActionOnError: this.trxActionOnError }, config) as TransactionPreHookOptions['config']

    const opts: TransactionPreHookOptions = {
      kmore: this,
      config: config2,
    }
    let ctx: TraceContext | undefined = this.enableTrace ? context.active() : void 0
    const { transactionPreHooks } = this.hookList
    if (transactionPreHooks.length) {
      for (const fn of transactionPreHooks) {
        let tmp: HookReturn | void
        if (this.enableTrace && ctx) {
          tmp = await context.with(ctx, async () => {
            return fn(opts)
          })
        }
        else {
          tmp = await fn(opts)
        }

        if (this.enableTrace && tmp?.traceContext) {
          ctx = tmp.traceContext
        }
      }
    }

    let trx = await this.dbh.transaction(void 0, opts.config) as KmoreTransaction
    trx = createTrxProxy({
      kmore: this,
      config: opts.config,
      transaction: trx,
    })

    const { transactionPostHooks } = this.hookList
    const opts2: TransactionHookOptions = {
      kmore: this,
      trx: trx,
      config: opts.config,
    }
    if (transactionPostHooks.length) {
      for (const fn of transactionPostHooks) {
        let tmp: HookReturn | void
        if (this.enableTrace && ctx) {
          tmp = await context.with(ctx, async () => {
            return fn(opts2)
          })
        }
        else {
          tmp = await fn(opts2)
        }

        if (this.enableTrace && tmp?.traceContext) {
          ctx = tmp.traceContext
        }
      }
    }

    this.setTrx(trx)
    return trx
  }

  async finishTransaction(options: FinishTransactionOptions): Promise<void> {
    if (this.enableTrace) {
      return context.with(context.active(), () => this._finishTransaction(options))
    }
    return this._finishTransaction(options)
  }

  async _finishTransaction(options: FinishTransactionOptions): Promise<void> {
    const { trx, action } = options
    if (! trx) { return }

    const op = action ?? trx.trxActionOnError
    switch (op) {
      case TrxControl.Rollback: {
        await trx.rollback()
        break
      }

      case TrxControl.Commit: {
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
  const inst = _knex(knexConfig)
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
  hookList?: Partial<HookList> | undefined
  /**
   * @default false
   */
  enableTrace?: boolean
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
  start: (event: KmoreEvent, ctx: Kmore) => void
  query: (event: KmoreEvent, ctx: Kmore) => void
  queryResponse: (event: KmoreEvent, ctx: Kmore) => void
  queryError: (event: KmoreEvent, ctx: Kmore) => Promise<void>
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
  queryBuilder: KmoreQueryBuilder
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



export interface CreateProxyThenOptions {
  kmore: Kmore
  builder: KmoreQueryBuilder
}
export type ProxyThenRunnerOptions = CreateProxyThenOptions & ProxyRunnerExtraOptions

// #region proxy

export interface CreateProxyTrxOptions {
  kmore: Kmore
  config: KmoreTransactionConfig
  transaction: KmoreTransaction
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
  action?: TrxControl
  scope?: ScopeType | undefined
}

export interface QueryContext {
  wrapIdentifierCaseConvert: CaseType
  /**
   * Rules ignoring table identifier case conversion,
   */
  wrapIdentifierIgnoreRule: WrapIdentifierIgnoreRule | undefined
  postProcessResponseCaseConvert: CaseType
  kmoreQueryId: symbol
  columns: Record<string, string>[]
  kmore: Kmore
  builder: KmoreQueryBuilder
}
