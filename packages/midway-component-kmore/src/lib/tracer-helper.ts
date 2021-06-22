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

import { DbConfig, QuerySpanInfo } from './types'

import { Context } from '~/interface'


interface ProcessQueryEventWithIdOpts {
  ctx: Context
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  queryUidSpanMap: Map<string, QuerySpanInfo>
  reqId: string
  tagClass: string
  tracerManager: TracerManager
}
export async function processQueryEventWithEventId(
  options: ProcessQueryEventWithIdOpts,
): Promise<void> {

  const {
    ctx,
    dbConfig,
    ev,
    logger,
    queryUidSpanMap,
    reqId,
    tagClass,
    tracerManager,
  } = options

  if (! ev.identifier) { return }

  if (! tracerManager) {
    console.info(`processQueryEventWithEventId(): ctx.tracerManager undefined,
    may running at component when test case. kmove enent  skipped`)
    return
  }

  const currSpan = tracerManager.currentSpan()
  if (! currSpan) {
    options.logger.warn(`Get current SPAN undefined. className: "${tagClass}", reqId: "${reqId}"`)
    // this.unSubscribeEvent()
    return
  }

  const span = tracerManager.genSpan('DbComponent', currSpan)

  const opts: ProcessOpts = {
    ctx,
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
  await processSwitch(opts)
}

interface ProcessQueryRespAndExEventWithIdOpts {
  ctx: Context
  dbConfig: DbConfig
  ev: KmoreEvent
  logger: Logger
  queryUidSpanMap: Map<string, QuerySpanInfo>
}
export async function processQueryRespAndExEventWithEventId(
  options: ProcessQueryRespAndExEventWithIdOpts,
): Promise<void> {

  const { ctx, dbConfig, ev, logger, queryUidSpanMap } = options

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
      ctx,
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
  ctx: Context
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
      await caseQueryResp(options)
      cleanQueryUidSpanMap(queryUidSpanMap, queryUid)
      break
    }

    case 'queryError': {
      await caseQueryError(options)
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
  const { tracerManager } = options.ctx
  const { config: knexConfig, sampleThrottleMs } = options.dbConfig
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
    time: genISO8601String(),
  }
  span.log(input)
  tracerManager.spanLog(input)
}


async function caseQueryResp(options: ProcessOpts): Promise<void> {
  const { logger } = options
  const { tracerManager } = options.ctx
  const { sampleThrottleMs } = options.dbConfig
  const { span, timestamp: start } = options.spanInfo
  const { respRaw, timestamp: end } = options.ev

  const cost = end - start
  if (respRaw?.response.command) {
    span.addTags({
      [TracerTag.dbCommand]: respRaw.response.command,
      [TracerLog.queryRowCount]: respRaw?.response.rowCount ?? 0,
      [TracerLog.queryCost]: cost,
    })
  }

  const input: SpanLogInput = {
    event: TracerLog.queryFinish,
    time: genISO8601String(),
    [TracerLog.queryCost]: cost,
  }

  if (sampleThrottleMs > 0 && cost > sampleThrottleMs) {
    span.addTags({
      [Tags.SAMPLING_PRIORITY]: 50,
      [TracerTag.logLevel]: 'warn',
    })
    input.level = 'warn'
    input[TracerLog.svcMemoryUsage] = humanMemoryUsage()
    const procInfo = await retrieveProcInfo()
    input.procInfo = procInfo
    // span.log(input)
    logger.log(input, span)
  }
  else {
    span.log(input)
  }

  tracerManager.spanLog(input)
  span.finish()
}

async function caseQueryError(options: ProcessOpts): Promise<void> {
  const { logger } = options
  const { tracerManager } = options.ctx
  const { span, reqId, tagClass, timestamp: start } = options.spanInfo
  const {
    kUid, queryUid, trxId, exData, exError, timestamp: end,
  } = options.ev

  const cost = end - start
  const procInfo = await retrieveProcInfo()
  const input = {
    event: TracerLog.queryError,
    level: 'error',
    time: genISO8601String(),
    reqId,
    kUid,
    tagClass,
    queryUid,
    trxId,
    [TracerLog.queryCost]: cost,
    [TracerLog.svcMemoryUsage]: humanMemoryUsage(),
    procInfo,
  }

  span.addTags({
    [Tags.ERROR]: true,
    [Tags.SAMPLING_PRIORITY]: 100,
    [TracerTag.logLevel]: 'error',
    exData,
    exError,
  })
  // span.log(logInput)
  logger.log(input, span)
  tracerManager.spanLog(input)
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
