import { Logger } from '@mw-components/jaeger'
import {
  Kmore,
  KmoreEvent,
} from 'kmore'
import { Knex } from 'knex'
import { Span } from 'opentracing'
import { Observable, Subscription } from 'rxjs'
import { filter } from 'rxjs/operators'

import {
  processQueryEventWithEventId,
  processQueryRespAndExEventWithEventId,
} from './tracer-helper'
import { DbConfig, QuerySpanInfo } from './types'

import { Context } from '~/interface'


export class TracerKmoreComponent<D = unknown> extends Kmore<D> {

  ctx: Context
  logger: Logger

  dbEventObb: Observable<KmoreEvent> | undefined
  dbEventSubscription: Subscription | undefined
  queryEventSubscription: Subscription | undefined
  RespAndExEventSubscription: Subscription | undefined

  readonly queryUidSpanMap = new Map<string, QuerySpanInfo>()

  constructor(
    public readonly dbConfig: DbConfig<D>,
    public dbh: Knex,
    context?: Context,
    logger?: Logger,
  ) {

    super(
      dbConfig.config,
      dbConfig.dict,
      dbh,
      Symbol(Date.now()),
    )

    if (context) {
      this.ctx = context
    }
    else {
      throw new TypeError('Parameter context undefined')
    }

    if (logger) {
      this.logger = logger
    }
    else {
      throw new TypeError('TracerKmoreComponent: Parameter logger undefined')
    }

    if (! this.ctx.tracerManager) {
      console.info('ctx.tracerManager undefined, may running at component when test case. kmore event subscription skipped')
    }

    this.registerDbObservable(this.instanceId)
    this.subscribeEvent()
    this.ctx.res && this.ctx.res.once('finish', () => this.unsubscribeEvent())
    // process.once('exit', () => {
    //   this.unsubscribe()
    // })
  }


  private registerDbObservable(
    tracerInstId: string | symbol,
  ): void {
    // const obb = this.register((ev) => {
    //   return this.eventFilter(ev, this.instanceId)
    // })
    const obb = this.register<string | symbol, Span>(
      (ev, id) => this.eventFilter(ev, id, this.instanceId),
      tracerInstId,
    )
    this.dbEventObb = obb
  }


  private eventFilter(
    ev: KmoreEvent,
    id: unknown,
    currId: string | symbol | undefined,
  ): boolean {

    const { type, queryUid } = ev

    // if (ev.identifier) {
    //   return false
    // }

    if (this.queryUidSpanMap.size > 10000) {
      throw new Error('BaseRepo.queryUidSpanMap.size exceed 10000')
    }

    if (type !== 'query' && type !== 'queryResponse' && type !== 'queryError') {
      return false
    }

    if (! queryUid) {
      return false
    }

    const span = this.queryUidSpanMap.get(queryUid)
    if (span && type === 'query') {
      return false
    }

    // const flag = id === BaseRepo.tracerInstId
    const flag = !! (currId && id === currId)
    return flag
  }

  protected subscribeEvent(): void {
    if (! this.dbEventObb) {
      throw new Error('dbEventObb invalid')
    }

    const subsp = this.dbEventObb.pipe(
      filter((ev) => {
        return ev.type === 'query' || ev.type === 'queryResponse' || ev.type === 'queryError'
      }),
    ).subscribe({
      next: async (ev) => {
        if (ev.type === 'query') {
          const { name: tagClass } = this.constructor
          await processQueryEventWithEventId({
            ctx: this.ctx,
            dbConfig: this.dbConfig,
            ev,
            logger: this.logger,
            queryUidSpanMap: this.queryUidSpanMap,
            reqId: this.ctx.reqId,
            tagClass,
            tracerManager: this.ctx.tracerManager,
          })
        }
        else {
          if (! ev.identifier) { return }
          await processQueryRespAndExEventWithEventId({
            ctx: this.ctx,
            dbConfig: this.dbConfig,
            ev,
            logger: this.logger,
            queryUidSpanMap: this.queryUidSpanMap,
          })
        }
      },
      error: (ex) => {
        this.logger.error(ex)
      },
    })

    this.dbEventSubscription = subsp
  }

  protected unsubscribeEvent(): void {
    this.dbEventSubscription?.unsubscribe()
  }


  protected unsubscribeQueryEvent(): void {
    this.queryEventSubscription?.unsubscribe()
  }

  protected unsubscribeRespAndExEvent(): void {
    this.RespAndExEventSubscription?.unsubscribe()
  }

}

