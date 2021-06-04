/* eslint-disable import/no-extraneous-dependencies */
import { DbDict } from 'kmore-types'
import { Knex, knex } from 'knex'
import { Observable, Subject } from 'rxjs'
import { filter } from 'rxjs/operators'

import { defaultPropDescriptor } from './config'
import { bindOnQuery, bindOnQueryError, bindOnQueryResp } from './event'
import {
  DbQueryBuilder,
  KmoreEvent,
  KnexConfig,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryResponse,
} from './types'


export class Kmore<D = unknown> {
  readonly refTables: DbQueryBuilder<D, 'ref_'>

  protected readonly subject: Subject<KmoreEvent>

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

  constructor(
    public readonly config: KnexConfig,
    public readonly dict: DbDict<D>,
    public dbh: Knex,
    public instanceId: string | symbol,
    // private readonly eventCallback?: (event: KmoreEvent) => void,
  ) {

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
    this.refTables = this.createRefTables(dbh, 'ref_')
    this.subject = new Subject()
  }

  register<K = unknown, T = unknown>(
    eventFilterCallback?: (ev: KmoreEvent<T>, identifier?: K) => boolean,
    identifier?: K,
  ): Observable<KmoreEvent<T>> {

    const stream$ = this.subject.asObservable() as Observable<KmoreEvent<T>>
    const ret$ = stream$.pipe(
      filter((ev) => {
        const flag = typeof eventFilterCallback === 'function'
          ? eventFilterCallback(ev, identifier)
          : true
        return flag
      }),
    )
    return ret$
  }

  unsubscribe(): void {
    this.subject.unsubscribe()
  }


  protected createRefTables(dbh: Knex, prefix: string): DbQueryBuilder<D> {
    const rb = {} as DbQueryBuilder<D>

    Object.keys(this.dict.tables).forEach((refName) => {
      const name = `${prefix}${refName}`
      Object.defineProperty(rb, name, {
        ...defaultPropDescriptor,
        value: (identifier?: unknown) => {
          const id = typeof identifier === 'undefined' ? this.instanceId : identifier
          return this.extRefTableFnProperty(dbh, refName, id)
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
    identifier?: unknown,
  ): Knex.QueryBuilder {

    let refTable = dbh(refName)
    if (typeof identifier !== 'undefined') {
      refTable = refTable
        .on('query', (data: OnQueryData) => bindOnQuery(this.subject, identifier, data))
        .on(
          'query-response',
          (_: QueryResponse, respRaw: OnQueryRespRaw) => bindOnQueryResp(this.subject, identifier, _, respRaw),
        )
        .on(
          'query-error',
          (err: OnQueryErrorErr, data: OnQueryErrorData) => bindOnQueryError(this.subject, identifier, err, data),
        )
    }

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
