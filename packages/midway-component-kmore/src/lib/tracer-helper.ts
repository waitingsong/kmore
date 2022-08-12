/* eslint-disable import/no-extraneous-dependencies */
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

import { ConfigKey } from './config'
import { DbConfig, QuerySpanInfo } from './types'


interface ProcessStartEventOpts {
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  queryUidSpanMap: Map<string, QuerySpanInfo>
  tagClass: string
  trm: TracerManager
}
export async function processStartEvent(
  options: ProcessStartEventOpts,
): Promise<void> {

  const {
    dbConfig,
    ev,
    logger,
    queryUidSpanMap,
    tagClass,
    trm,
  } = options

  if (! trm) { return }

  const currSpan = trm.currentSpan()
  if (! currSpan) {
    if (options.logger.warn) {
      options.logger.warn('Get current SPAN undefined.')
    }
    else {
      console.warn('Get current SPAN undefined.')
    }
    return
  }

  const opts: ProcessOpts = {
    trm,
    ev,
    dbConfig,
    logger,
    queryUidSpanMap,
    spanInfo: {
      span: currSpan,
      tagClass,
      timestamp: ev.timestamp,
    },
  }
  await processSwitch(opts)
}

interface ProcessQueryEventOpts {
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  queryUidSpanMap: Map<string, QuerySpanInfo>
  tagClass: string
  trm: TracerManager
}
export async function processQueryEvent(
  options: ProcessQueryEventOpts,
): Promise<void> {

  const {
    dbConfig,
    ev,
    logger,
    queryUidSpanMap,
    tagClass,
    trm,
  } = options

  if (! trm) { return }

  const { kUid, queryUid } = ev
  const spanInfo = queryUidSpanMap.get(queryUid)
  if (spanInfo) { // duplicate query
    cleanQueryUidSpanMap(queryUidSpanMap, queryUid)
    const input: SpanLogInput = {
      [TracerTag.logLevel]: 'warn',
      message: 'Duplicate queryUid into processQueryEventWithEventId()',
      kUid,
      queryUid,
      event: TracerLog.queryStart,
      queryUidSpanMapSize: queryUidSpanMap.size,
      time: genISO8601String(),
    }
    trm.spanLog(input)
    return
  }

  const currSpan = trm.currentSpan()
  if (! currSpan && options.logger.warn) {
    options.logger.warn(`Get current SPAN undefined. className: "${tagClass}"`)
    return
  }

  const span = trm.genSpan(ConfigKey.componentName, currSpan)

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

interface ProcessQueryRespAndExEventOpts {
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  queryUidSpanMap: Map<string, QuerySpanInfo>
  trm: TracerManager
}
export async function processQueryRespAndExEvent(
  options: ProcessQueryRespAndExEventOpts,
): Promise<void> {

  const { trm, dbConfig, ev, logger, queryUidSpanMap } = options

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
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  spanInfo: QuerySpanInfo
  queryUidSpanMap: Map<string, QuerySpanInfo>
  trm: TracerManager
}
async function processSwitch(options: ProcessOpts): Promise<void> {
  const { ev, spanInfo, queryUidSpanMap } = options
  const { type, queryUid } = ev

  switch (type) {
    case 'start':
      caseStart(options)
      break

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

function caseStart(options: ProcessOpts): void {
  const { trm, queryUidSpanMap } = options
  const { dbId } = options.ev

  const input: SpanLogInput = {
    event: 'query-builder-start',
    dbId,
    queryUidSpanMapSize: queryUidSpanMap.size,
    time: genISO8601String(),
  }
  trm.spanLog(input)
}


function caseQuery(options: ProcessOpts): void {
  const { trm, queryUidSpanMap } = options
  const { config: knexConfig, sampleThrottleMs } = options.dbConfig
  const { span, tagClass } = options.spanInfo
  const { dbId, kUid, queryUid, trxId, data } = options.ev
  const conn = knexConfig.connection as ConnectionConfig

  span.addTags({
    dbId,
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
    dbId,
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
  const { dbId, queryUid, respRaw, timestamp: end } = options.ev

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
    dbId,
    time: genISO8601String(),
    [TracerLog.queryCost]: cost,
    queryUid,
    queryUidSpanMapSize: queryUidSpanMap.size,
    [TracerLog.svcMemoryUsage]: humanMemoryUsage(),
  }

  if (typeof sampleThrottleMs === 'number' && sampleThrottleMs > 0 && cost > sampleThrottleMs) {
    const tags: SpanLogInput = {
      [Tags.SAMPLING_PRIORITY]: 50,
      [TracerTag.logLevel]: 'warn',
    }
    if (! tracingResponse && respRaw) {
      tags[TracerLog.queryResponse] = respRaw?.response?.rows
    }
    span.addTags(tags)
    input['level'] = 'warn'
    const procInfo = await retrieveProcInfo()
    input['procInfo'] = procInfo
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
    dbId, kUid, queryUid, trxId, exData, exError, timestamp: end,
  } = options.ev

  const cost = end - start
  const procInfo = await retrieveProcInfo()
  const input = {
    event: TracerLog.queryError,
    level: 'error',
    time: genISO8601String(),
    dbId,
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


export async function cleanAllQuerySpan(options: ProcessQueryRespAndExEventOpts): Promise<void> {
  const { queryUidSpanMap, trm } = options

  queryUidSpanMap.forEach((info, queryUid) => {
    const { span, tagClass, timestamp: start } = info
    const { dbId, timestamp: end } = options.ev

    if (! span) {
      console.error('span is null, during clean all span when kmore error')
      return
    }

    const cost = end - start
    const input: SpanLogInput = {
      event: 'Kmore:cleanAllQuerySpan',
      message: 'finish all span on error',
      level: 'warn',
      time: genISO8601String(),
      dbId,
      tagClass,
      queryUid,
      queryUidSpanMapSize: queryUidSpanMap.size,
      [TracerLog.queryCost]: cost,
    }

    // logger.log && logger.log(input, span)
    span.log(input)
    trm.spanLog(input)
    span.finish()
  })
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

