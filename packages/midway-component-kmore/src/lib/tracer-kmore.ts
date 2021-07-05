import { App } from '@midwayjs/decorator'
import { Logger, TracerManager } from '@mw-components/jaeger'
import {
  Kmore,
  KmoreEvent,
} from 'kmore'
import { Knex } from 'knex'
import { Span } from 'opentracing'
import { Observable, Subscription } from 'rxjs'
import { filter } from 'rxjs/operators'


import { DbManager } from './db-man'
import {
  processQueryEventWithEventId,
  processQueryRespAndExEventWithEventId,
} from './tracer-helper'
import { DbConfig } from './types'

import { Context } from '~/interface'


export class TracerKmoreComponent<D = unknown> extends Kmore<D> {
  logger: Logger
  ctxTracerManager: TracerManager


  constructor(
    public readonly dbConfig: DbConfig<D>,
    public dbh: Knex,
    protected ctx: Context,
    protected dbMan: DbManager,
  ) {

    super(
      dbConfig.config,
      dbConfig.dict,
      dbh,
      Symbol(Date.now()),
    )

    if (! ctx) {
      throw new TypeError('Parameter context undefined')
    }

    // if (logger) {
    //   this.logger = logger
    // }
    // else {
    //   throw new TypeError('TracerKmoreComponent: Parameter logger undefined')
    // }
    // const ctxTracerManager = await this.ctx.requestContext.getAsync(TracerManager)
    if (! this.ctx.tracerManager) {
      console.info('context tracerManager undefined, may running at component when test case. kmore event subscription skipped')
    }

    this.registerDbObservable(this.instanceId)
    this.subscribeEvent()
    // this.ctx.res && this.ctx.res.once('finish', () => this.unsubscribeEvent())
    // process.once('exit', () => {
    //   this.unsubscribe()
    // })
  }



}

