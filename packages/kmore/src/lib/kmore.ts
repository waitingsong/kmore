/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import assert from 'assert'

import type { DbDict } from 'kmore-types'
import type { Knex } from 'knex'
// eslint-disable-next-line no-duplicate-imports, import/no-named-default
import { default as _knex } from 'knex'

import { defaultPropDescriptor, initialConfig } from './config.js'
import {
  callCbOnQuery,
  callCbOnQueryError,
  callCbOnQueryResp,
  callCbOnStart,
  CallCbOptionsBase,
} from './event.js'
import { PostProcessInput, postProcessResponse, wrapIdentifier } from './helper.js'
import {
  CaseType,
  DbQueryBuilder,
  EventCallbacks,
  KmoreQueryBuilder,
  KmoreTransaction,
  KmoreTransactionConfig,
  KnexConfig,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryContext,
  QueryResponse,
  QuerySpanInfo,
} from './types.js'


export class Kmore<D = any, Context = any> {

  /**
   * Original table names, without case convertion.
   */
  readonly refTables: DbQueryBuilder<Context, D, 'ref_', CaseType.none>

  /**
   * Create a table reference function property with camel case convertion.
   */
  readonly camelTables: DbQueryBuilder<Context, D, 'ref_', CaseType.camel>

  // readonly pascalTables: DbQueryBuilder<D, 'ref_', CaseType.pascal>

  /**
   * Create a table reference function property with snake case convertion.
   */
  readonly snakeTables: DbQueryBuilder<Context, D, 'ref_', CaseType.snake>

  /**
  * Generics parameter, do NOT access as variable!
  * Use under typescript development only.
  *
  * @example ```ts
  * const km = kmoreFactore<Db>({})
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
  * const km = kmoreFactore<Db>({})
  * type Dict = typeof kmore['Dict']
  * type Uid = Dict['columns']['tb_user']['alias']['tbUserUid'] // equal to literal 'tb_user.uid'
  * ```
  */
  readonly Dict: DbDict<D>

  readonly queryUidSpanMap = new Map<string, QuerySpanInfo>()
  readonly postProcessResponseSet = new Set<typeof postProcessResponse>()
  readonly trxActionOnError: KmoreTransactionConfig['trxActionOnError'] = 'rollback'
  /**
   * kmoreTrxid => trx
   */
  readonly trxMap = new Map<symbol, KmoreTransaction>()
  /**
   * kmoreTrxId => Set<kmoreQueryId>
   */
  readonly trxIdQueryMap: TrxIdQueryMap = new Map()
  /**
   * context => Set<kmoreTrxId>
   */
  readonly ctxTrxIdMap = new WeakMap<object, Set<symbol>>()

  readonly config: KnexConfig
  readonly dict: unknown extends D ? undefined : DbDict<D>
  readonly dbId: string
  readonly dbh: Knex
  readonly instanceId: string | symbol
  readonly eventCallbacks: EventCallbacks<Context> | undefined
  readonly wrapIdentifierCaseConvert: CaseType


  constructor(options: KmoreFactoryOpts<D, Context>) {
    const dbId = options.dbId ? options.dbId : Date.now().toString()
    this.dbId = dbId
    this.instanceId = options.instanceId ? options.instanceId : Symbol(`${dbId}-` + Date.now().toString())
    this.eventCallbacks = options.eventCallbacks

    const config = {
      ...initialConfig,
      ...options.config,
    }
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

    /**
     * Table identifier case convertion,
     * If not CaseType.none, will ignore value of `KnexConfig['wrapIdentifier']`
     */
    this.wrapIdentifierCaseConvert = options.wrapIdentifierCaseConvert ?? CaseType.snake

    if (this.wrapIdentifierCaseConvert !== CaseType.none
      && this.config.wrapIdentifier !== wrapIdentifier) {
      this.config.wrapIdentifier = wrapIdentifier
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

    if (options.trxActionOnError) {
      this.trxActionOnError = options.trxActionOnError
    }

    this.refTables = this.createRefTables<'ref_'>('ref_', CaseType.none)
    this.camelTables = this.createRefTables<'ref_'>('ref_', CaseType.camel)
    // this.pascalTables = this.createRefTables<'ref_'>('ref_', CaseType.pascal)
    this.snakeTables = this.createRefTables<'ref_'>('ref_', CaseType.snake)


    this.dbh = options.dbh ? options.dbh : createDbh(this.config)
  }

  /**
   * Start a transaction.
   */
  async transaction(
    id?: PropertyKey,
    config?: KmoreTransactionConfig,
  ): Promise<KmoreTransaction> {

    const kmoreTrxId = typeof id === 'symbol'
      ? id
      : id ? Symbol(id) : Symbol(Date.now())

    const tmp = await this.dbh.transaction(void 0, config)

    Object.defineProperty(tmp, 'kmoreTrxId', {
      ...defaultPropDescriptor,
      enumerable: false,
      value: kmoreTrxId,
    })

    const trxActionOnError: KmoreTransactionConfig['trxActionOnError'] = config?.trxActionOnError
      ?? this.trxActionOnError ?? 'rollback'
    Object.defineProperty(tmp, 'trxActionOnError', {
      ...defaultPropDescriptor,
      enumerable: false,
      value: trxActionOnError,
    })

    if (trxActionOnError === 'none') {
      return tmp as KmoreTransaction
    }

    const trx = this.createTrxProxy(tmp as KmoreTransaction)
    this.trxMap.set(kmoreTrxId, trx)
    this.trxIdQueryMap.set(kmoreTrxId, new Set())

    return trx
  }

  getTrxByKmoreQueryId(kmoreQueryId: symbol): KmoreTransaction | undefined {
    for (const [trxId, queryIdSet] of this.trxIdQueryMap.entries()) {
      if (queryIdSet.has(kmoreQueryId)) {
        const trx = this.trxMap.get(trxId)
        if (trx) {
          return trx
        }
      }
    }
  }

  getTrxByKmoreTrxId(id: symbol): KmoreTransaction | undefined {
    return this.trxMap.get(id)
  }

  setCtxTrxIdMap(
    ctx: unknown,
    kmoreTrxId: symbol,
  ): void {

    if (! ctx || ! kmoreTrxId || typeof ctx !== 'object') { return }
    if (! this.ctxTrxIdMap.get(ctx)) {
      this.ctxTrxIdMap.set(ctx, new Set())
    }
    this.ctxTrxIdMap.get(ctx)?.add(kmoreTrxId)
  }

  getTrxSetByCtx(
    ctx: unknown,
  ): Set<KmoreTransaction> {

    const ret = new Set<KmoreTransaction>()
    if (! ctx || typeof ctx !== 'object') {
      return ret
    }
    const trxIdMap = this.ctxTrxIdMap.get(ctx)
    trxIdMap?.forEach((kmoreTrxId) => {
      const trx = this.trxMap.get(kmoreTrxId)
      if (trx) {
        ret.add(trx)
      }
    })
    return ret
  }

  async doTrxActionOnError(trx: KmoreTransaction | undefined): Promise<void> {
    if (! trx) { return }
    if (! trx.isCompleted()) {
      this.trxMap.delete(trx.kmoreTrxId)
    }
    switch (trx.trxActionOnError) {
      case 'rollback': {
        await trx.rollback()
        this.trxMap.delete(trx.kmoreTrxId)
        this.trxIdQueryMap.delete(trx.kmoreTrxId)
        break
      }

      case 'commit': {
        await trx.commit()
        this.trxMap.delete(trx.kmoreTrxId)
        this.trxIdQueryMap.delete(trx.kmoreTrxId)
        break
      }

      default:
        break
    }
  }

  destroy(): Promise<void> {
    return this.dbh.destroy()
  }



  protected createTrxProxy(trx: KmoreTransaction): KmoreTransaction {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const commit = new Proxy(trx.commit, {
      apply: (target: typeof trx.commit, ctx: KmoreTransaction, args: unknown[]) => {
        this.trxIdQueryMap.delete(ctx.kmoreTrxId)
        this.trxMap.delete(ctx.kmoreTrxId)
        return Reflect.apply(target, ctx, args)
      },
    })
    Object.defineProperty(trx, 'commit', {
      enumerable: true,
      writable: true,
      configurable: false,
      value: commit,
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const rollback = new Proxy(trx.rollback, {
      apply: (target: typeof trx.rollback, ctx: KmoreTransaction, args: unknown[]) => {
        this.trxIdQueryMap.delete(ctx.kmoreTrxId)
        this.trxMap.delete(ctx.kmoreTrxId)
        return Reflect.apply(target, ctx, args)
      },
    })
    Object.defineProperty(trx, 'rollback', {
      enumerable: true,
      writable: true,
      configurable: false,
      value: rollback,
    })

    return trx
  }


  protected createRefTables<P extends string>(
    prefix: P,
    caseConvert: CaseType,
  ): DbQueryBuilder<Context, D, P, CaseType> {

    const rb = {} as DbQueryBuilder<Context, D, P, CaseType>

    if (! this.dict || ! this.dict.tables || ! Object.keys(this.dict.tables).length) {
      console.info('Kmore:createRefTables() this.dict or this.dict.tables empty')
      return rb
    }

    Object.keys(this.dict.tables).forEach((refName) => {
      const name = `${prefix}${refName}`
      Object.defineProperty(rb, name, {
        ...defaultPropDescriptor,
        writable: true,
        value: (ctx?: Context) => {
          return this.extRefTableFnProperty(refName, caseConvert, ctx)
        }, // must dynamically!!
      })

      Object.defineProperty(rb[name as keyof typeof rb], 'name', {
        ...defaultPropDescriptor,
        value: name,
      })

    })

    return rb
  }

  protected extRefTableFnProperty(
    refName: string,
    caseConvert: CaseType,
    ctx: Context | undefined,
  ): KmoreQueryBuilder {

    assert(caseConvert, 'caseConvert must be defined')

    const kmoreQueryId = Symbol(`${this.dbId}-${Date.now()}`)

    let refTable = this.dbh(refName)

    refTable = this.extRefTableFnPropertyCallback(
      refTable as KmoreQueryBuilder,
      caseConvert,
      ctx,
      kmoreQueryId,
    )
    refTable = this.extRefTableFnPropertyTransacting(refTable as KmoreQueryBuilder, ctx)
    refTable = this.extRefTableFnPropertyThen(refTable as KmoreQueryBuilder)

    void Object.defineProperty(refTable, 'kmoreQueryId', {
      ...defaultPropDescriptor,
      value: kmoreQueryId,
    })

    return refTable as KmoreQueryBuilder
  }

  protected extRefTableFnPropertyCallback(
    refTable: KmoreQueryBuilder,
    caseConvert: CaseType,
    ctx: Context | undefined,
    kmoreQueryId: symbol,
  ): KmoreQueryBuilder {

    assert(caseConvert, 'caseConvert must be defined')

    const queryCtxOpts: QueryContext = {
      wrapIdentifierCaseConvert: this.wrapIdentifierCaseConvert,
      postProcessResponseCaseConvert: caseConvert,
      kmoreQueryId,
    }
    const opts: CallCbOptionsBase = {
      ctx,
      dbId: this.dbId,
      cbs: this.eventCallbacks,
      identifier: this.instanceId,
      kmoreQueryId,
    }

    const refTable2 = refTable
      .queryContext(queryCtxOpts)
      .on(
        'start',
        async (builder: KmoreQueryBuilder) => callCbOnStart({
          ...opts,
          builder,
        }),
      )
      .on(
        'query',
        async (data: OnQueryData) => callCbOnQuery({
          ...opts,
          data,
        }),
      )
      .on(
        'query-response',
        async (resp: QueryResponse, respRaw: OnQueryRespRaw) => callCbOnQueryResp({
          ...opts,
          _resp: resp,
          respRaw,
        }),
      )
      .on(
        'query-error',
        async (err: OnQueryErrorErr, data: OnQueryErrorData) => {
          const trx = this.getTrxByKmoreQueryId(kmoreQueryId)
          await this.doTrxActionOnError(trx)
          return callCbOnQueryError({
            ...opts,
            err,
            data,
          })
        },
      )

    return refTable2 as KmoreQueryBuilder
  }

  protected extRefTableFnPropertyTransacting(
    refTable: KmoreQueryBuilder,
    ctx: Context | undefined,
  ): KmoreQueryBuilder {

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const ts = new Proxy(refTable.transacting, {
      apply: (target: KmoreQueryBuilder['transacting'], ctx2: KmoreQueryBuilder, args: [KmoreTransaction]) => {
        const [trx] = args
        assert(trx?.isTransaction === true, 'trx must be a transaction')
        const { kmoreTrxId } = trx
        const qid = ctx2.kmoreQueryId as symbol | undefined
        if (qid && kmoreTrxId) {
          this.trxIdQueryMap.get(kmoreTrxId)?.add(qid)
          this.setCtxTrxIdMap(ctx, kmoreTrxId)
        }
        return Reflect.apply(target, ctx2, args)
      },
    })
    void Object.defineProperty(refTable, 'transacting', {
      ...defaultPropDescriptor,
      value: ts,
    })

    return refTable as KmoreQueryBuilder
  }

  protected extRefTableFnPropertyThen(refTable: KmoreQueryBuilder): KmoreQueryBuilder {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const pm = new Proxy(refTable.then, {
      apply: (target: () => Promise<unknown>, ctx2: KmoreQueryBuilder, args: unknown[]) => {
        const qid = ctx2.kmoreQueryId
        const trx = this.getTrxByKmoreQueryId(qid)
        if (! trx) {
          return Reflect.apply(target, ctx2, args)
        }

        return (Reflect.apply(target, ctx2, args) as Promise<unknown>)
          .catch(async (err: unknown) => {
            const trx2 = this.getTrxByKmoreQueryId(qid)
            await this.doTrxActionOnError(trx2)
            return Promise.reject(err)
          })

      },
    })
    void Object.defineProperty(refTable, 'then', {
      ...defaultPropDescriptor,
      configurable: true,
      value: pm,
    })

    return refTable as KmoreQueryBuilder
  }

  protected postProcessResponse(
    result: any,
    queryContext?: QueryContext,
  ): unknown {

    let ret = result
    for (const fn of this.postProcessResponseSet) {
      ret = fn(ret, queryContext)
    }
    return ret
  }

}

export interface KmoreFactoryOpts<D, Ctx = unknown> {
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
  eventCallbacks?: EventCallbacks<Ctx> | undefined
  /**
   * Table identifier case convertion,
   * If not CaseType.none, will ignore value of `KnexConfig['wrapIdentifier']`
   * @default CaseType.snake
   * @docs https://knexjs.org/guide/#wrapidentifier
   */
  wrapIdentifierCaseConvert?: CaseType | undefined
  /**
   * Atuo trsaction action (rollback|commit|none) on error (Rejection or Exception),
   * @CAUTION **Will always rollback if query error in database even though this value set to 'commit'**
   * @default rollback
   */
  trxActionOnError?: KmoreTransactionConfig['trxActionOnError']
}

export function KmoreFactory<D, Ctx = unknown>(options: KmoreFactoryOpts<D, Ctx>): Kmore<D, Ctx> {
  const km = new Kmore<D, Ctx>(options)
  return km
}

export function createDbh(knexConfig: KnexConfig): Knex {
  const inst = _knex(knexConfig)
  return inst
}


/**
 * kmoreTrxId => Set<kmoreQueryId>
 */
type TrxIdQueryMap = Map<symbol, Set<symbol>>

