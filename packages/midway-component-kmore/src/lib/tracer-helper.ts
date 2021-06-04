/* eslint-disable import/no-extraneous-dependencies */
// import { Provide } from '@midwayjs/decorator'
// import { loggers, ILogger } from '@midwayjs/logger'
import { genISO8601String, humanMemoryUsage } from '@waiting/shared-core'
import { KmoreEvent } from 'kmore'
import {
  Logger,
  SpanLogInput,
  TracerManager,
  TracerLog,
  TracerTag,
} from 'midway-component-jaeger'
import { Tags } from 'opentracing'

import { DbConfig, QuerySpanInfo } from './types'


interface ProcessQueryEventWithIdOpts {
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  queryUidSpanMap: Map<string, QuerySpanInfo>
  reqId: string
  tagClass: string
  tracerManager: TracerManager
}
export function processQueryEventWithEventId(
  options: ProcessQueryEventWithIdOpts,
): void {

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
export function processQueryRespAndExEventWithEventId(
  options: ProcessQueryRespAndExEventWithIdOpts,
): void {

  const { dbConfig, ev, logger, queryUidSpanMap } = options

  if (! ev.identifier) { return }

  const { queryUid } = ev
  const spanInfo = queryUidSpanMap.get(queryUid)

  if (spanInfo) {
    // const { tagClass, reqId, span } = spanInfo
    // logger.log({
    //   level: 'debug',
    //   time: genISO8601String(),
    //   msg: `queryUid: "${queryUid}" (className: "${tagClass}", reqId: "${reqId}") with SAPN related `,
    // }, span)
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
    time: genISO8601String(),
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
    time: genISO8601String(),
    reqId,
    queryUid,
    trxId: trxId ?? '',
    sql: respRaw?.sql ?? '',
    bindings: respRaw?.bindings,
    [TracerLog.queryRowCount]: respRaw?.response.rowCount ?? 0,
  }

  const cost = end - start
  if (sampleThrottleMs > 0 && cost > sampleThrottleMs) {
    span.addTags({
      [Tags.SAMPLING_PRIORITY]: 50,
      [TracerTag.logLevel]: 'warn',
    })
    input.level = 'warn'
    input[TracerLog.queryCost] = cost
    input[TracerLog.queryCostThottleInMS] = sampleThrottleMs

    const conn = knexConfig.connection as ConnectionConfig
    input.kUid = kUid
    input.tagClass = tagClass
    input[TracerTag.dbClient] = knexConfig.client
    input[TracerTag.dbHost] = conn.host
    input[TracerTag.dbDatabase] = conn.database
    input[TracerTag.dbPort] = conn.port ?? ''
    input[TracerTag.dbUser] = conn.user
    input[TracerLog.svcMemoryUsage] = humanMemoryUsage()

    // span.log(input)
    logger.log(input, span)
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
    level: 'error',
    time: genISO8601String(),
    reqId,
    kUid,
    tagClass,
    queryUid,
    trxId,
    exData,
    exError,
    [TracerTag.dbClient]: knexConfig.client,
    [TracerTag.dbHost]: conn.host,
    [TracerTag.dbDatabase]: conn.database,
    [TracerTag.dbPort]: conn.port ?? '',
    [TracerTag.dbUser]: conn.user,
    [TracerLog.queryCost]: cost,
    [TracerLog.queryCostThottleInMS]: sampleThrottleMs,
    [TracerLog.svcMemoryUsage]: humanMemoryUsage(),
  }

  span.addTags({
    [Tags.ERROR]: true,
    [Tags.SAMPLING_PRIORITY]: 100,
    [TracerTag.logLevel]: 'error',
  })
  // span.log(logInput)
  logger.log(logInput, span)

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


declare module '@midwayjs/core' {
  interface Context {
    reqId: string
  }
}
