/* eslint-disable import/no-extraneous-dependencies */
import assert from 'assert'

import {
  SpanLogInput,
  TracerLog,
  TracerTag,
} from '@mw-components/jaeger'
import {
  genISO8601String,
  humanMemoryUsage,
} from '@waiting/shared-core'
import type { DbDict } from 'kmore-types'
import type { Knex } from 'knex'
// eslint-disable-next-line no-duplicate-imports, import/no-named-default
import { default as _knex } from 'knex'

import { defaultPropDescriptor } from './config.js'
import { bindOnQuery, bindOnQueryError, bindOnQueryResp, globalSubject } from './event.js'
import {
  CaseType,
  DbQueryBuilder,
  KmoreEvent,
  KnexConfig,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryContext,
  QueryResponse,
  QuerySpanInfo,
} from './types.js'


export class Kmore<D = unknown> {

  readonly refTables: DbQueryBuilder<D, 'ref_', CaseType.none>
  readonly camelTables: DbQueryBuilder<D, 'ref_', CaseType.camel>
  // readonly pascalTables: DbQueryBuilder<D, 'ref_', CaseType.pascal>
  readonly snakeTables: DbQueryBuilder<D, 'ref_', CaseType.snake>

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

  protected listenEvent = true
  // protected readonly subject: Subject<KmoreEvent>

  constructor(
    public readonly config: KnexConfig,
    public readonly dict: DbDict<D>,
    public dbh: Knex,
    public instanceId: string | symbol,
  ) {

    this.refTables = this.createRefTables<'ref_'>(this.dbh, 'ref_', CaseType.none)
    this.camelTables = this.createRefTables<'ref_'>(this.dbh, 'ref_', CaseType.camel)
    // this.pascalTables = this.createRefTables<'ref_'>(this.dbh, 'ref_', CaseType.pascal)
    this.snakeTables = this.createRefTables<'ref_'>(this.dbh, 'ref_', CaseType.snake)
  }

  unsubscribe(): void {
    this.queryUidSpanMap.forEach((info) => {
      const { span } = info
      if (span) {
        const input: SpanLogInput = {
          [TracerTag.logLevel]: 'warn',
          message: 'finish span on Kmore unsubscribe()',
          event: 'Kmore:unsubscribe',
          queryUidSpanMapSize: this.queryUidSpanMap.size,
          time: genISO8601String(),
          [TracerLog.svcMemoryUsage]: humanMemoryUsage(),
        }
        span.log(input)
        span.finish()
      }
    })
    this.listenEvent = false
  }


  protected createRefTables<P extends string>(
    dbh: Knex,
    prefix: P,
    caseConvert: CaseType,
  ): DbQueryBuilder<D, P, CaseType> {

    const rb = {} as DbQueryBuilder<D, P, CaseType>

    if (! this.dict || ! this.dict.tables || ! Object.keys(this.dict.tables).length) {
      console.info('Kmore:createRefTables() this.dict or this.dict.tables empty')
      return rb
    }

    Object.keys(this.dict.tables).forEach((refName) => {
      const name = `${prefix}${refName}`
      Object.defineProperty(rb, name, {
        ...defaultPropDescriptor,
        value: () => {
          return this.extRefTableFnProperty(dbh, refName, caseConvert)
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
    dbh: Knex,
    refName: string,
    caseConvert: CaseType,
  ): Knex.QueryBuilder {

    assert(caseConvert, 'caseConvert must be defined')

    const opts: QueryContext = {
      caseConvert,
    }
    const refTable = dbh(refName).queryContext(opts)
    return refTable
  }

  // private triggerEvent(event: KmoreEvent): void {
  //   if (this.eventCallback) {
  //     this.eventCallback(event)
  //   }
  //   void 0
  // }

}

export interface KmoreFactoryOpts<D> {
  config: KnexConfig
  dict: DbDict<D>
  instanceId?: string | symbol
  dbh?: Knex
  dbId?: string
}
export type EventCallback = (event: KmoreEvent) => void

export function kmoreFactory<D extends object>(
  options: KmoreFactoryOpts<D>,
  enableTracing = false,
): Kmore<D> {

  const dbId = options.dbId ? options.dbId : ''
  const dbh: Knex = options.dbh ? options.dbh : createDbh(options.config, enableTracing)
  const instanceId = options.instanceId ? options.instanceId : Symbol(`${dbId}-` + Date.now().toString())
  const km = new Kmore<D>(
    options.config,
    options.dict,
    dbh,
    instanceId,
  )
  return km
}

export function createDbh(
  knexConfig: KnexConfig,
  enableTracing = false,
): Knex {

  let inst = _knex(knexConfig)

  if (enableTracing) {
    inst = inst
      .on('query', (data: OnQueryData) => bindOnQuery(globalSubject, void 0, data))
      .on(
        'query-response',
        (_: QueryResponse, respRaw: OnQueryRespRaw) => bindOnQueryResp(globalSubject, void 0, _, respRaw),
      )
      .on(
        'query-error',
        (err: OnQueryErrorErr, data: OnQueryErrorData) => bindOnQueryError(globalSubject, void 0, err, data),
      )
  }

  return inst
}


