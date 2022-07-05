import { Logger, TracerManager } from '@mw-components/jaeger'
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
import { DbConfig } from './types'

import type { Context, BindUnsubscribeEventFunc } from '~/interface'


export class TracerKmoreComponent<D = unknown> extends Kmore<D> {

  dbEventObb: Observable<KmoreEvent> | undefined
  dbEventSubscription: Subscription | undefined

  protected logger: Logger
  protected tracerManager: TracerManager

  constructor(
    public readonly dbConfig: DbConfig<D>,
    public override dbh: Knex,
    protected ctx: Context,
    jlogger?: Logger,
    protected trm?: TracerManager,
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

    if (! trm) {
      console.info('context tracerManager undefined, may running at component when test case. kmore event subscription skipped')
      throw new TypeError('Parameter tracerManager undefined!')
    }
    this.tracerManager = trm
    this.registerDbObservable(this.instanceId)
    this.subscribeEvent()
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
          this.tracerManager.finishSpan()
        }
      }),
    ).subscribe({
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      next: async (ev) => {

        const currSpan = this.tracerManager.currentSpan()
        if (! currSpan) {
          // requext finished
          const name = 'DbComponentOrphan'
          this.tracerManager.startSpan(name)
          // const span = globalTracer().startSpan(name)
          isNewSpan = true
        }

        if (ev.type === 'query') {
          const { name: tagClass } = this.constructor
          await processQueryEventWithEventId({
            trm: this.tracerManager,
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
            trm: this.tracerManager,
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

}


export const unsubscribeEventFuncOnResFinish: BindUnsubscribeEventFunc = (ctx, km) => {
  if (! ctx || ! ctx.res) {
    console.warn('ctx or ctx.res undefined')
    return
  }
  ctx.res.once && ctx.res.once('finish', () => {
    if (km instanceof TracerKmoreComponent) {
      km.unsubscribeEvent()
    }
    km.unsubscribe()
  })
}
