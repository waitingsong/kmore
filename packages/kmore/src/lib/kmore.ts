/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import assert from 'assert'

import type { DbDict } from 'kmore-types'
import type { Knex } from 'knex'
// eslint-disable-next-line no-duplicate-imports, import/no-named-default
import { default as _knex } from 'knex'

import { KmoreBase } from './base.js'
import { createRefTables } from './builder.index.js'
import { DbQueryBuilder, KmoreQueryBuilder } from './builder.types.js'
import { initialConfig } from './config.js'
import { PostProcessInput, postProcessResponse, wrapIdentifier } from './helper.js'
import { createTrxProperties } from './proxy.trx.js'
import {
  CaseType,
  EventCallbacks,
  KmoreTransaction,
  KmoreTransactionConfig,
  KnexConfig,
  QueryContext,
  TrxIdQueryMap,
} from './types.js'
import { genKmoreTrxId } from './util.js'


export class Kmore<D = any, Context = any> extends KmoreBase<Context> {

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

  readonly postProcessResponseSet = new Set<typeof postProcessResponse>()
  readonly trxActionOnEnd: KmoreTransactionConfig['trxActionOnEnd'] = 'rollback'
  /**
   * kmoreTrxId => trx
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
    super()

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

    /**
     * Table identifier case convertion,
     * If not CaseType.none, will ignore value of `KnexConfig['wrapIdentifier']`
     */
    this.wrapIdentifierCaseConvert = options.wrapIdentifierCaseConvert ?? CaseType.snake

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

    if (options.trxActionOnEnd) {
      this.trxActionOnEnd = options.trxActionOnEnd
    }

    this.refTables = createRefTables<D, Context, 'ref_'>(this, 'ref_', CaseType.none)
    this.camelTables = createRefTables<D, Context, 'ref_'>(this, 'ref_', CaseType.camel)
    // this.pascalTables = this.createRefTables<'ref_'>('ref_', CaseType.pascal)
    this.snakeTables = createRefTables<D, Context, 'ref_'>(this, 'ref_', CaseType.snake)


    this.dbh = options.dbh ? options.dbh : createDbh(this.config)
  }

  /**
   * Start a transaction.
   */
  async transaction(config?: KmoreTransactionConfig): Promise<KmoreTransaction> {
    const kmoreTrxId = config?.kmoreTrxId ?? genKmoreTrxId(config?.kmoreTrxId)
    delete config?.kmoreTrxId
    const trx = await this.dbh.transaction(void 0, config) as KmoreTransaction

    const trxActionOnEnd: KmoreTransactionConfig['trxActionOnEnd'] = config?.trxActionOnEnd
      ?? this.trxActionOnEnd ?? 'rollback'

    const ret = createTrxProperties({
      kmore: this,
      kmoreTrxId,
      trx,
      trxActionOnEnd,
    })
    return ret
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

    assert(ctx, 'ctx must be defined')
    assert(kmoreTrxId, 'kmoreTrxId must be defined')
    assert(typeof ctx === 'object')

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

  async finishTransaction(trx: KmoreTransaction | undefined): Promise<void> {
    if (! trx) { return }
    if (! trx.isCompleted()) {
      this.trxMap.delete(trx.kmoreTrxId)
    }
    switch (trx.trxActionOnEnd) {
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

  finishTransactionByQueryId(kmoreQueryId: symbol): Promise<void> {
    const trx = this.getTrxByKmoreQueryId(kmoreQueryId)
    return this.finishTransaction(trx)
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
  trxActionOnEnd?: KmoreTransactionConfig['trxActionOnEnd']
}

export function KmoreFactory<D, Ctx = unknown>(options: KmoreFactoryOpts<D, Ctx>): Kmore<D, Ctx> {
  const km = new Kmore<D, Ctx>(options)
  return km
}

export function createDbh(knexConfig: KnexConfig): Knex {
  const inst = _knex.knex(knexConfig)
  return inst
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


