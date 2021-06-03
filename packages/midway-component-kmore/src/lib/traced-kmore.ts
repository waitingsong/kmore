/* eslint-disable import/no-extraneous-dependencies */
// import { Provide } from '@midwayjs/decorator'
// import { loggers, ILogger } from '@midwayjs/logger'
import { IMidwayWebContext as Context } from '@midwayjs/web'
import { genISO8601String, humanMemoryUsage } from '@waiting/shared-core'
import {
  Kmore,
  KmoreEvent,
} from 'kmore'
import { Knex } from 'knex'
import {
  Logger,
  SpanLogInput,
  TracerManager,
  TracerLog,
  TracerTag,
} from 'midway-component-jaeger'
import { Span, Tags } from 'opentracing'
import { Observable, Subscription } from 'rxjs'
import { filter } from 'rxjs/operators'

import { DbConfig } from './types'


export class TracedKmoreComponent<D = unknown> extends Kmore<D> {
  ctx: Context
  logger: Logger

  dbEventObb: Observable<KmoreEvent> | undefined
  dbEventSubscription: Subscription | undefined
  // queryEventObb: Observable<KmoreEvent> | undefined
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
      throw new TypeError('Parameter logger undefined')
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
      next: (ev) => {
        if (ev.type === 'query') {
          const { name: tagClass } = this.constructor
          processQueryEventWithEventId({
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
          processQueryRespAndExEventWithEventId({
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


interface ProcessQueryEventWithIdOpts {
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  queryUidSpanMap: Map<string, QuerySpanInfo>
  reqId: string
  tagClass: string
  tracerManager: TracerManager
}
function processQueryEventWithEventId(options: ProcessQueryEventWithIdOpts): void {
  const {
    dbConfig,
    ev,
    logger,
    queryUidSpanMap,
    reqId,
    tagClass,
    tracerManager,
  } = options

  if (! ev.identifier) { return }

  const currSpan = tracerManager.currentSpan()
  if (! currSpan) {
    options.logger.warn(`get current SPAN undefined. className: "${tagClass}", reqId: "${reqId}"`)
    // this.unSubscribeEvent()
    return
  }

  const span = tracerManager.genSpan(TracerTag.dbName, currSpan)

  const opts: ProcessOpts = {
    ev,
    dbConfig,
    logger,
    queryUidSpanMap,
    spanInfo: {
      reqId,
      span,
      tagClass,
      timestamp: ev.timestamp,
    },
  }
  processSwitch(opts)
}

interface ProcessQueryRespAndExEventWithIdOpts {
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  queryUidSpanMap: Map<string, QuerySpanInfo>
}
function processQueryRespAndExEventWithEventId(options: ProcessQueryRespAndExEventWithIdOpts): void {
  const { dbConfig, ev, logger, queryUidSpanMap } = options

  if (! ev.identifier) { return }

  const { queryUid } = ev
  const spanInfo = queryUidSpanMap.get(queryUid)

  if (spanInfo) {
    const { tagClass, reqId } = spanInfo

    logger.debug(
      `queryUid: "${queryUid}" (className: "${tagClass}", reqId: "${reqId}") with SAPN related `,
    )
    const opts: ProcessOpts = {
      ev,
      dbConfig,
      logger,
      queryUidSpanMap,
      spanInfo,
    }
    processSwitch(opts)
  }
}

interface ProcessOpts {
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  spanInfo: QuerySpanInfo
  queryUidSpanMap: Map<string, QuerySpanInfo>
}
function processSwitch(options: ProcessOpts): void {
  const { ev, spanInfo, queryUidSpanMap } = options
  const { type, queryUid } = ev

  switch (type) {
    case 'query': {
      queryUidSpanMap.set(queryUid, spanInfo)
      caseQuery(options)
      break
    }

    case 'queryResponse': {
      caseQueryResp(options)
      cleanQueryUidSpanMap(queryUidSpanMap, queryUid)
      break
    }

    case 'queryError': {
      caseQueryError(options)
      cleanQueryUidSpanMap(queryUidSpanMap, queryUid)
      break
    }

    default: {
      void 0
      break
    }
  }
}

function caseQuery(options: ProcessOpts): void {
  const { config: knexConfig } = options.dbConfig
  const { span, reqId, tagClass } = options.spanInfo
  const { kUid, queryUid, trxId, data } = options.ev
  const conn = knexConfig.connection as ConnectionConfig

  span.addTags({
    [TracerTag.reqId]: reqId,
    [TracerTag.callerClass]: tagClass,
    [TracerTag.dbClient]: knexConfig.client,
    [TracerTag.dbHost]: conn.host,
    [TracerTag.dbDatabase]: conn.database,
    [TracerTag.dbPort]: conn.port ?? '',
    [TracerTag.dbUser]: conn.user,
  })
  span.log({
    event: TracerLog.queryStart,
    kUid,
    queryUid,
    trxId: trxId ?? '',
    sql: data?.sql ?? '',
    // bindings: data?.bindings,
  })
}


function caseQueryResp(options: ProcessOpts): void {
  const { logger } = options
  const { config: knexConfig, sampleThrottleMs } = options.dbConfig
  const { span, reqId, tagClass, timestamp: start } = options.spanInfo
  const { kUid, queryUid, respRaw, trxId, timestamp: end } = options.ev

  if (respRaw?.response.command) {
    span.addTags({
      [TracerTag.dbCommand]: respRaw.response.command,
    })
  }

  const input: SpanLogInput = {
    event: TracerLog.queryFinish,
    queryUid,
    trxId: trxId ?? '',
    sql: respRaw?.sql ?? '',
    bindings: respRaw?.bindings,
    time: genISO8601String(),
    [TracerLog.queryRowCount]: respRaw?.response.rowCount ?? 0,
  }

  const cost = end - start
  if (sampleThrottleMs > 0 && cost > sampleThrottleMs) {
    span.addTags({ [Tags.SAMPLING_PRIORITY]: 50 })
    input[TracerLog.queryCost] = cost
    input[TracerLog.queryCostThottleInSec] = sampleThrottleMs * 0.001

    const conn = knexConfig.connection as ConnectionConfig
    const logDetail = {
      ...input,
      reqId,
      kUid,
      tagClass,
      [TracerLog.svcMemoryUsage]: humanMemoryUsage(),
      [TracerTag.dbClient]: knexConfig.client,
      [TracerTag.dbHost]: conn.host,
      [TracerTag.dbDatabase]: conn.database,
      [TracerTag.dbPort]: conn.port ?? '',
      [TracerTag.dbUser]: conn.user,
    }
    logger.warn(logDetail)
    span.log(logDetail)
  }
  else {
    span.log(input)
  }

  span.finish()
}

function caseQueryError(options: ProcessOpts): void {
  const { logger } = options
  const { config: knexConfig, sampleThrottleMs } = options.dbConfig
  const { span, reqId, tagClass, timestamp: start } = options.spanInfo
  const {
    kUid, queryUid, trxId, exData, exError, timestamp: end,
  } = options.ev
  const conn = knexConfig.connection as ConnectionConfig

  const cost = end - start
  const logInput = {
    event: TracerLog.queryError,
    queryUid,
    trxId,
    exData,
    exError,
    time: genISO8601String(),
    [TracerLog.svcMemoryUsage]: humanMemoryUsage(),
    [TracerLog.queryCost]: cost,
    [TracerLog.queryCostThottleInSec]: sampleThrottleMs * 0.001,
  }

  const logDetail = {
    ...logInput,
    reqId,
    kUid,
    tagClass,
    [TracerTag.dbClient]: knexConfig.client,
    [TracerTag.dbHost]: conn.host,
    [TracerTag.dbDatabase]: conn.database,
    [TracerTag.dbPort]: conn.port ?? '',
    [TracerTag.dbUser]: conn.user,
  }
  logger.error(logDetail)

  span.addTags({
    [Tags.ERROR]: true,
    [Tags.SAMPLING_PRIORITY]: 100,
  })
  span.log(logInput)
  span.finish()
}

function cleanQueryUidSpanMap(
  queryUidSpanMap: Map<string, QuerySpanInfo>,
  queryUid: string,
): void {
  queryUidSpanMap.delete(queryUid)
}


interface ConnectionConfig {
  host: string
  port?: number
  user: string
  password: string
  database: string
  domain?: string
  instanceName?: string
  debug?: boolean
  requestTimeout?: number
}

interface QuerySpanInfo {
  reqId: string
  span: Span
  tagClass: string
  timestamp: number
}


declare module '@midwayjs/core' {
  interface Context {
    reqId: string
  }
}
