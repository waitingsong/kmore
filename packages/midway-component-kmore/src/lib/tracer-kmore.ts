import { Logger } from '@mw-components/jaeger'
import {
  Kmore,
  KmoreEvent,
  globalEvent,
} from 'kmore'
import { Knex } from 'knex'
// import { globalTracer } from 'opentracing'
import { Observable, Subscription } from 'rxjs'
import { filter, finalize } from 'rxjs/operators'

import {
  processQueryEventWithEventId,
  processQueryRespAndExEventWithEventId,
} from './tracer-helper'
import { DbConfig, QuerySpanInfo } from './types'

import { Context } from '~/interface'


export class TracerKmoreComponent<D = unknown> extends Kmore<D> {

  dbEventObb: Observable<KmoreEvent> | undefined
  dbEventSubscription: Subscription | undefined
  queryEventSubscription: Subscription | undefined
  RespAndExEventSubscription: Subscription | undefined

  readonly queryUidSpanMap = new Map<string, QuerySpanInfo>()
  protected logger: Logger

  constructor(
    public readonly dbConfig: DbConfig<D>,
    public dbh: Knex,
    protected ctx: Context,
    jlogger?: Logger,
  ) {

    super(
      dbConfig.config,
      dbConfig.dict,
      dbh,
      Symbol(Date.now()),
    )

    if (! this.ctx) {
      throw new TypeError('Parameter context undefined')
    }

    if (! jlogger) {
      throw new TypeError('Parameter jlogger undefined!')
    }
    this.logger = jlogger

    if (this.ctx.tracerManager) {
      this.registerDbObservable(this.instanceId)
      this.subscribeEvent()
    }
    else {
      console.info('context tracerManager undefined, may running at component when test case. kmore event subscription skipped')
    }
  }

  unsubscribeEvent(): void {
    if (this.dbEventSubscription && ! this.dbEventSubscription.closed) {
      this.dbEventSubscription.unsubscribe()
    }
    this.dbEventObb = void 0
    // do not run this.unsubscribe()
  }

  private registerDbObservable(
    tracerInstId: string | symbol,
  ): void {

    const obb = globalEvent.pipe(
      filter((ev) => {
        return this.eventFilter(ev, tracerInstId, this.instanceId)
      }),
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

    let isNewSpan = false

    const subsp = this.dbEventObb.pipe(
      filter((ev) => {
        return ev.type === 'query' || ev.type === 'queryResponse' || ev.type === 'queryError'
      }),
      finalize(() => {
        if (isNewSpan) {
          this.ctx.tracerManager.finishSpan()
        }
      }),
    ).subscribe({
      next: async (ev) => {

        const currSpan = this.ctx.tracerManager.currentSpan()
        if (! currSpan) {
          // requext finished
          const name = 'DbComponentOrphan'
          this.ctx.tracerManager.startSpan(name)
          // const span = globalTracer().startSpan(name)
          isNewSpan = true
        }

        if (ev.type === 'query') {
          const { name: tagClass } = this.constructor
          await processQueryEventWithEventId({
            trm: this.ctx.tracerManager,
            dbConfig: this.dbConfig,
            ev,
            logger: this.logger,
            queryUidSpanMap: this.queryUidSpanMap,
            tagClass,
          })
        }
        else {
          // if (! ev.identifier) { return }
          await processQueryRespAndExEventWithEventId({
            trm: this.ctx.tracerManager,
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


  protected unsubscribeQueryEvent(): void {
    this.queryEventSubscription?.unsubscribe()
  }

  protected unsubscribeRespAndExEvent(): void {
    this.RespAndExEventSubscription?.unsubscribe()
  }

}

