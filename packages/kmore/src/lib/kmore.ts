/* eslint-disable import/no-extraneous-dependencies */
import { JsonObject } from '@waiting/shared-types'
import { DbDict } from 'kmore-types'
import { Knex, knex } from 'knex'
import { Observable, Subject } from 'rxjs'
import { filter } from 'rxjs/operators'

import { defaultPropDescriptor, initKmoreEvent } from './config'
import {
  DbQueryBuilder,
  KmoreEvent,
  KnexConfig,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRawData,
  RawResponse,
} from './types'


export class Kmore<D = unknown> {
  readonly refTables: DbQueryBuilder<D, 'ref_'>

  private readonly subject: Subject<KmoreEvent>

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
    // private readonly eventCallback?: (event: KmoreEvent) => void,
  ) {

    const dbhBindEvent = dbh
      .on('query', (data: OnQueryData): void => {
        const queryUid = this.pickQueryUidFrom(data)
        this.processKnexOnEvent({ type: 'query', data, queryUid })
      })
      .on('query-response', (data: RawResponse, raw: OnQueryRespRawData): void => {
        const queryUid = this.pickQueryUidFrom(raw)
        this.processKnexOnEvent({
          type: 'queryResponse', respData: data, respRawData: raw, queryUid,
        })
      })
      .on('query-error', (err: OnQueryErrorErr, data: OnQueryErrorData): void => {
        const queryUid = this.pickQueryUidFrom(data)
        this.processKnexOnEvent({
          type: 'queryError', exError: err, exData: data, queryUid,
        })
      })
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


  private processKnexOnEvent(input: Partial<KmoreEvent>): void {
    const ev: KmoreEvent = {
      ...initKmoreEvent,
      ...input,
    }
    this.subject.next(ev)
  }

  private pickQueryUidFrom(input: OnQueryData | OnQueryErrorData | OnQueryRespRawData): string {
    return input.__knexQueryUid ? input.__knexQueryUid : ''
  }

  private createRefTables(dbh: Knex, prefix: string): DbQueryBuilder<D> {
    const rb = {} as DbQueryBuilder<D>

    Object.keys(this.dict.tables).forEach((refName) => {
      const name = `${prefix}${refName}`
      Object.defineProperty(rb, name, {
        ...defaultPropDescriptor,
        // value: (): QueryBuilderExt<D[keyof D]> => this.extRefTableFnProperty(refName), // must dynamically!!
        value: (identifier?: unknown) => this.extRefTableFnProperty(dbh, refName, identifier), // must dynamically!!
      })

      Object.defineProperty(rb[name as keyof typeof rb], 'name', {
        ...defaultPropDescriptor,
        value: name,
      })
    })

    return rb
  }

  private extRefTableFnProperty(
    dbh: Knex,
    refName: string,
    identifier?: unknown,
  ) {

    let refTable = dbh(refName)
    if (identifier) {
      refTable = refTable
        .on('query', (data: OnQueryData): void => {
          const queryUid = this.pickQueryUidFrom(data)
          this.processKnexOnEvent({
            type: 'query',
            identifier,
            queryUid,
            data,
          })
        })
        .on('query-response', (data: JsonObject[], raw: OnQueryRespRawData): void => {
          const queryUid = this.pickQueryUidFrom(raw)
          this.processKnexOnEvent({
            type: 'queryResponse',
            identifier,
            queryUid,
            respData: data,
            respRawData: raw,
          })
        })
        .on('query-error', (err: OnQueryErrorErr, data: OnQueryErrorData): void => {
          const queryUid = this.pickQueryUidFrom(data)
          this.processKnexOnEvent({
            type: 'queryError',
            identifier,
            queryUid,
            exError: err,
            exData: data,
          })
        })
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
}
export type EventCallback = (event: KmoreEvent) => void

export function kmoreFactory<D>(options: KmoreFactoryOpts<D>): Kmore<D> {
  const dbh: Knex = knex(options.config)
  const km = new Kmore<D>(
    options.config,
    options.dict,
    dbh,
  )
  return km
}

