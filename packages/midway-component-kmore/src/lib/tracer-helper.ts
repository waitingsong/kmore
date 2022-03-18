/* eslint-disable import/no-extraneous-dependencies */
// import { Provide } from '@midwayjs/decorator'
// import { loggers, ILogger } from '@midwayjs/logger'
import {
  Logger,
  SpanLogInput,
  TracerManager,
  TracerLog,
  TracerTag,
} from '@mw-components/jaeger'
import {
  genISO8601String,
  humanMemoryUsage,
  retrieveProcInfo,
} from '@waiting/shared-core'
import { KmoreEvent } from 'kmore'
import { Tags } from 'opentracing'

import { TracerKmoreComponent } from './tracer-kmore'
import { BindUnsubscribeEventFunc, DbConfig, QuerySpanInfo } from './types'


interface ProcessQueryEventWithIdOpts {
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  queryUidSpanMap: Map<string, QuerySpanInfo>
  tagClass: string
  trm: TracerManager
}
export async function processQueryEventWithEventId(
  options: ProcessQueryEventWithIdOpts,
): Promise<void> {

  const {
    dbConfig,
    ev,
    logger,
    queryUidSpanMap,
    tagClass,
    trm,
  } = options

  // if (! ev.identifier) { return }

  if (! trm) {
    // console.info(`processQueryEventWithEventId(): ctx.tracerManager undefined,
    // may running at component test case. kmore event processing skipped`)
    return
  }

  const spanInfo = queryUidSpanMap.get(ev.queryUid)
  if (spanInfo) {
    const { kUid, queryUid } = ev

    cleanQueryUidSpanMap(queryUidSpanMap, queryUid)
    const input: SpanLogInput = {
      [TracerTag.logLevel]: 'warn',
      message: 'Duplicate queryUid into processQueryEventWithEventId()',
      kUid,
      queryUid,
      event: TracerLog.queryStart,
      queryUidSpanMapSize: queryUidSpanMap.size,
      time: genISO8601String(),
      [TracerLog.svcMemoryUsage]: humanMemoryUsage(),
    }
    trm.spanLog(input)
    return
  }

  const currSpan = trm.currentSpan()
  if (! currSpan && options.logger.warn) {
    options.logger.warn(`Get current SPAN undefined. className: "${tagClass}"`)
    // this.unSubscribeEvent()
    return
  }

  const span = trm.genSpan('DbComponent', currSpan)

  const opts: ProcessOpts = {
    trm,
    ev,
    dbConfig,
    logger,
    queryUidSpanMap,
    spanInfo: {
      span,
      tagClass,
      timestamp: ev.timestamp,
    },
  }
  await processSwitch(opts)
}

interface ProcessQueryRespAndExEventWithIdOpts {
  trm: TracerManager
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  queryUidSpanMap: Map<string, QuerySpanInfo>
}
export async function processQueryRespAndExEventWithEventId(
  options: ProcessQueryRespAndExEventWithIdOpts,
): Promise<void> {

  const { trm, dbConfig, ev, logger, queryUidSpanMap } = options

  // if (! ev.identifier) { return }

  const { queryUid } = ev
  const spanInfo = queryUidSpanMap.get(queryUid)

  if (spanInfo) {
    // logger.log({
    //   level: 'debug',
    //   time: genISO8601String(),
    //   msg: `queryUid: "${queryUid}" (className: "${tagClass}" ) with SAPN related `,
    // }, span)
    const opts: ProcessOpts = {
      trm,
      ev,
      dbConfig,
      logger,
      queryUidSpanMap,
      spanInfo,
    }
    await processSwitch(opts)
  }
}

interface ProcessOpts {
  trm: TracerManager
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  spanInfo: QuerySpanInfo
  queryUidSpanMap: Map<string, QuerySpanInfo>
}
async function processSwitch(options: ProcessOpts): Promise<void> {
  const { ev, spanInfo, queryUidSpanMap } = options
  const { type, queryUid } = ev

  switch (type) {
    case 'query': {
      queryUidSpanMap.set(queryUid, spanInfo)
      caseQuery(options)
      break
    }

    case 'queryResponse': {
      cleanQueryUidSpanMap(queryUidSpanMap, queryUid)
      await caseQueryResp(options)
      break
    }

    case 'queryError': {
      cleanQueryUidSpanMap(queryUidSpanMap, queryUid)
      await caseQueryError(options)
      break
    }

    default: {
      void 0
      break
    }
  }
}

function caseQuery(options: ProcessOpts): void {
  const { trm, queryUidSpanMap } = options
  const { config: knexConfig, sampleThrottleMs } = options.dbConfig
  const { span, tagClass } = options.spanInfo
  const { kUid, queryUid, trxId, data } = options.ev
  const conn = knexConfig.connection as ConnectionConfig

  span.addTags({
    [TracerTag.callerClass]: tagClass,
    [TracerTag.dbClient]: knexConfig.client,
    [TracerTag.dbHost]: conn.host,
    [TracerTag.dbDatabase]: conn.database,
    [TracerTag.dbPort]: conn.port ?? '',
    [TracerTag.dbUser]: conn.user,
    [TracerLog.queryCostThottleInMS]: sampleThrottleMs,
    kUid,
    queryUid,
    trxId: trxId ?? '',
    sql: data?.sql ?? '',
    bindings: data?.bindings,
  })

  const input: SpanLogInput = {
    kUid,
    queryUid,
    event: TracerLog.queryStart,
    queryUidSpanMapSize: queryUidSpanMap.size,
    time: genISO8601String(),
    [TracerLog.svcMemoryUsage]: humanMemoryUsage(),
  }
  span.log(input)
  trm.spanLog(input)
}


async function caseQueryResp(options: ProcessOpts): Promise<void> {
  const { logger, trm, queryUidSpanMap } = options
  const { sampleThrottleMs, tracingResponse } = options.dbConfig
  const { span, timestamp: start } = options.spanInfo
  const { queryUid, respRaw, timestamp: end } = options.ev

  const cost = end - start
  if (respRaw?.response?.command) {
    const tags: SpanLogInput = {
      [TracerTag.dbCommand]: respRaw.response.command,
      [TracerLog.queryRowCount]: respRaw?.response.rowCount ?? 0,
      [TracerLog.queryCost]: cost,
    }
    if (tracingResponse) {
      tags[TracerLog.queryResponse] = respRaw.response?.rows
    }
    span.addTags(tags)
  }

  const input: SpanLogInput = {
    event: TracerLog.queryFinish,
    time: genISO8601String(),
    [TracerLog.queryCost]: cost,
    queryUid,
    queryUidSpanMapSize: queryUidSpanMap.size,
    [TracerLog.svcMemoryUsage]: humanMemoryUsage(),
  }

  if (sampleThrottleMs > 0 && cost > sampleThrottleMs) {
    const tags: SpanLogInput = {
      [Tags.SAMPLING_PRIORITY]: 50,
      [TracerTag.logLevel]: 'warn',
    }
    if (! tracingResponse && respRaw) {
      tags[TracerLog.queryResponse] = respRaw?.response?.rows
    }
    span.addTags(tags)
    input.level = 'warn'
    const procInfo = await retrieveProcInfo()
    input.procInfo = procInfo
    // span.log(input)
    logger.log && logger.log(input, span)
  }
  else {
    span.log(input)
  }

  trm.spanLog(input)
  span.finish()
}

async function caseQueryError(options: ProcessOpts): Promise<void> {
  const { logger, trm, queryUidSpanMap } = options
  const { span, tagClass, timestamp: start } = options.spanInfo
  const {
    kUid, queryUid, trxId, exData, exError, timestamp: end,
  } = options.ev

  const cost = end - start
  const procInfo = await retrieveProcInfo()
  const input = {
    event: TracerLog.queryError,
    level: 'error',
    time: genISO8601String(),
    kUid,
    tagClass,
    queryUid,
    trxId,
    queryUidSpanMapSize: queryUidSpanMap.size,
    [TracerLog.queryCost]: cost,
    [TracerLog.svcMemoryUsage]: humanMemoryUsage(),
    procInfo,
  }

  // span.log(logInput)
  logger.log && logger.log(input, span)
  trm.spanLog(input)

  span.addTags({
    [Tags.ERROR]: true,
    [Tags.SAMPLING_PRIORITY]: 100,
    [TracerTag.logLevel]: 'error',
    exData,
    exError,
  })
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

