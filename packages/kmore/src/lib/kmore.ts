/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import assert from 'assert'

import type { DbDict } from 'kmore-types'
import type { Knex } from 'knex'
// eslint-disable-next-line no-duplicate-imports, import/no-named-default
import { default as _knex } from 'knex'

import { defaultPropDescriptor, initialConfig } from './config.js'
import { callCbOnQuery, callCbOnQueryError, callCbOnQueryResp, callCbOnStart } from './event.js'
import { PostProcessInput, postProcessResponse, wrapIdentifier } from './helper.js'
import {
  CaseType,
  DbQueryBuilder,
  EventCallbacks,
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

  public readonly config: KnexConfig
  public readonly dict: unknown extends D ? undefined : DbDict<D>
  public readonly dbId: string
  public readonly dbh: Knex
  public readonly instanceId: string | symbol
  public readonly eventCallbacks: EventCallbacks<Context> | undefined
  public readonly wrapIdentifierCaseConvert: CaseType


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

    this.refTables = this.createRefTables<'ref_'>('ref_', CaseType.none)
    this.camelTables = this.createRefTables<'ref_'>('ref_', CaseType.camel)
    // this.pascalTables = this.createRefTables<'ref_'>('ref_', CaseType.pascal)
    this.snakeTables = this.createRefTables<'ref_'>('ref_', CaseType.snake)


    this.dbh = options.dbh ? options.dbh : createDbh(this.config)
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
  ): Knex.QueryBuilder {

    assert(caseConvert, 'caseConvert must be defined')

    const opts: QueryContext = {
      wrapIdentifierCaseConvert: this.wrapIdentifierCaseConvert,
      postProcessResponseCaseConvert: caseConvert,
    }
    const refTable = this.dbh(refName)
      .queryContext(opts)
      .on('start', async (builder: Knex.QueryBuilder) => callCbOnStart<Context>(
        ctx,
        this.dbId,
        this.eventCallbacks,
        this.instanceId,
        builder,
      ))
      .on('query', async (data: OnQueryData) => callCbOnQuery<Context>(
        ctx,
        this.dbId,
        this.eventCallbacks,
        this.instanceId,
        data,
      ))
      .on(
        'query-response',
        async (resp: QueryResponse, respRaw: OnQueryRespRaw) => callCbOnQueryResp<Context>(
          ctx,
          this.dbId,
          this.eventCallbacks,
          this.instanceId,
          resp,
          respRaw,
        ),
      )
      .on(
        'query-error',
        async (err: OnQueryErrorErr, data: OnQueryErrorData) => callCbOnQueryError<Context>(
          ctx,
          this.dbId,
          this.eventCallbacks,
          this.instanceId,
          err,
          data,
        ),
      )
    return refTable
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
}

export function KmoreFactory<D, Ctx = unknown>(options: KmoreFactoryOpts<D, Ctx>): Kmore<D, Ctx> {
  const km = new Kmore<D, Ctx>(options)
  return km
}

export function createDbh(knexConfig: KnexConfig): Knex {
  const inst = _knex(knexConfig)
  return inst
}

