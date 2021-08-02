/* eslint-disable import/no-extraneous-dependencies */
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
import { Knex, knex } from 'knex'
import { Subject } from 'rxjs'


import { defaultPropDescriptor } from './config'
import {
  bindOnQuery,
  bindOnQueryError,
  bindOnQueryResp,
  globalSubject,
} from './event'
import {
  DbQueryBuilder,
  KmoreEvent,
  KnexConfig,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryResponse,
  QuerySpanInfo,
} from './types'


export class Kmore<D = unknown> {
  readonly refTables: DbQueryBuilder<D, 'ref_'>

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
  protected readonly subject: Subject<KmoreEvent>

  constructor(
    public readonly config: KnexConfig,
    public readonly dict: DbDict<D>,
    public dbh: Knex,
    public instanceId: string | symbol,
  ) {

    this.subject = globalSubject

    const dbhBindEvent = dbh
      .on('query', (data: OnQueryData) => bindOnQuery(this.subject, void 0, data))
      .on(
        'query-response',
        (_: QueryResponse, respRaw: OnQueryRespRaw) => bindOnQueryResp(this.subject, void 0, _, respRaw),
      )
      .on(
        'query-error',
        (err: OnQueryErrorErr, data: OnQueryErrorData) => bindOnQueryError(this.subject, void 0, err, data),
      )
    this.dbh = dbhBindEvent
    this.refTables = this.createRefTables(this.dbh, 'ref_')
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


  protected createRefTables(dbh: Knex, prefix: string): DbQueryBuilder<D> {
    const rb = {} as DbQueryBuilder<D>

    if (! this.dict || ! this.dict.tables || ! Object.keys(this.dict.tables).length) {
      console.info('Kmore:createRefTables() this.dict or this.dict.tables empty')
      return rb
    }

    Object.keys(this.dict.tables).forEach((refName) => {
      const name = `${prefix}${refName}`
      Object.defineProperty(rb, name, {
        ...defaultPropDescriptor,
        value: () => {
          return this.extRefTableFnProperty(dbh, refName)
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
  ): Knex.QueryBuilder {

    const refTable = dbh(refName)
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

export function kmoreFactory<D>(options: KmoreFactoryOpts<D>): Kmore<D> {
  const dbId = options.dbId ? options.dbId : ''
  const dbh: Knex = options.dbh ? options.dbh : knex(options.config)
  const instanceId = options.instanceId ? options.instanceId : Symbol(`${dbId}-` + Date.now().toString())
  const km = new Kmore<D>(
    options.config,
    options.dict,
    dbh,
    instanceId,
  )
  return km
}
