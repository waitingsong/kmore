/* eslint-disable import/no-extraneous-dependencies */
import assert from 'node:assert'

import {
  TraceService,
  Attributes,
  AttrNames,
  Span,
  SpanStatusCode,
} from '@mwcp/otel'
import { SemanticAttributes } from '@opentelemetry/semantic-conventions'
import {
  genISO8601String,
  humanMemoryUsage,
} from '@waiting/shared-core'
import { KmoreEvent } from 'kmore'

import { DbConfig, QuerySpanInfo } from './types'


export interface TraceEventOptions {
  dbConfig: DbConfig
  ev: KmoreEvent
  queryUidSpanMap: Map<symbol, QuerySpanInfo>
  trm: TraceService
}

export interface TraceStartEventOptions extends TraceEventOptions {
  span: Span
}

export function traceStartEvent(
  options: TraceStartEventOptions,
): void {

  const {
    dbConfig,
    ev,
    queryUidSpanMap,
    trm,
    span,
  } = options

  assert(span, 'span is required')
  const spanInfo = {
    span,
    timestamp: ev.timestamp,
  }

  if (dbConfig.traceEvent) {
    const input: Attributes = {
      event: 'query-builder-start',
      dbId: ev.dbId,
      time: genISO8601String(),
    }
    trm.addEvent(span, input, { logCpuUsage: false, logMemeoryUsage: false })
  }
  queryUidSpanMap.set(ev.kmoreQueryId, spanInfo)
}

export function TraceQueryEvent(
  options: TraceEventOptions,
): void {

  const { dbConfig, trm, queryUidSpanMap } = options
  if (! dbConfig.traceEvent) { return }

  const { config: knexConfig, sampleThrottleMs } = options.dbConfig
  const {
    dbId, kUid, queryUid, trxId, data, kmoreQueryId,
    method,
  } = options.ev

  const spanInfo = queryUidSpanMap.get(kmoreQueryId)
  assert(spanInfo)

  const { span } = spanInfo
  const conn = knexConfig.connection as ConnectionConfig

  const input: Attributes = {
    event: AttrNames.QueryStart,
    dbId,
    kUid,
    queryUid,
    time: genISO8601String(),
  }
  trm.addEvent(span, input, { logCpuUsage: false, logMemeoryUsage: false })

  new Promise<void>((done) => {
    const name = method === 'del' ? 'delete' : method
    const spanName = `Kmore ${dbId} ${name}`
    span.updateName(spanName)

    const attrs: Attributes = {
      dbId,
      [SemanticAttributes.DB_SYSTEM]: typeof knexConfig.client === 'string'
        ? knexConfig.client
        : JSON.stringify(knexConfig.client, null, 2),
      [SemanticAttributes.NET_PEER_NAME]: conn.host,
      [SemanticAttributes.DB_NAME]: conn.database,
      [SemanticAttributes.NET_PEER_PORT]: conn.port ?? '',
      [SemanticAttributes.DB_USER]: conn.user,
      [AttrNames.QueryCostThottleInMS]: sampleThrottleMs,
      kUid,
      queryUid,
      trxId: trxId ?? '',
      [SemanticAttributes.DB_STATEMENT]: data?.sql ?? '',
      bindings: data?.bindings ? JSON.stringify(data.bindings, null, 2) : void 0,
    }
    trm.setAttributes(span, attrs)
    done()
  })
    .catch(console.error)
}

export function TraceQueryRespEvent(
  options: TraceEventOptions,
): void {

  const { dbConfig, trm, queryUidSpanMap } = options
  if (! dbConfig.traceEvent) { return }

  const { sampleThrottleMs, traceResponse } = options.dbConfig
  const { kmoreQueryId, dbId, queryUid, respRaw, timestamp: end } = options.ev

  const spanInfo = queryUidSpanMap.get(kmoreQueryId)
  assert(spanInfo, 'spanInfo not found for ' + kmoreQueryId.toString())
  const { span, timestamp: start } = spanInfo

  const cost = end - start
  if (respRaw?.response?.command) {
    const tags: Attributes = {
      [SemanticAttributes.DB_OPERATION]: respRaw.response.command,
      [AttrNames.QueryRowCount]: respRaw.response.rowCount ?? 0,
      [AttrNames.QueryCost]: cost,
    }
    if (traceResponse) {
      tags[AttrNames.QueryResponse] = JSON.stringify(respRaw.response.rows, null, 2)
    }
    trm.setAttributes(span, tags)
  }

  const input: Attributes = {
    event: AttrNames.QueryResponse,
    dbId,
    time: genISO8601String(),
    [AttrNames.QueryCost]: cost,
    queryUid,
  }

  if (typeof sampleThrottleMs === 'number' && sampleThrottleMs > 0 && cost > sampleThrottleMs) {
    const tags: Attributes = {
      // [AttrNames.SAMPLING_PRIORITY]: 50, // @FIXME
      [AttrNames.LogLevel]: 'warn',
    }
    if (! traceResponse && respRaw) {
      tags[AttrNames.QueryResponse] = JSON.stringify(respRaw.response?.rows, null, 2)
    }
    trm.setAttributes(span, tags)
  }

  trm.addEvent(span, input, { logCpuUsage: false, logMemeoryUsage: false })
  trm.endSpan(span)

  queryUidSpanMap.delete(kmoreQueryId)
}

export function TraceQueryExceptionEvent(options: TraceEventOptions): void {
  const { trm, queryUidSpanMap } = options

  const {
    kmoreQueryId, dbId, kUid, queryUid, trxId, exData, exError,
    timestamp: end,
  } = options.ev

  const spanInfo = queryUidSpanMap.get(kmoreQueryId)
  assert(spanInfo)
  const { span, timestamp: start } = spanInfo

  const cost = end - start
  const input = {
    event: AttrNames.QueryError,
    level: 'error',
    time: genISO8601String(),
    dbId,
    kUid,
    queryUid,
    trxId,
    [AttrNames.QueryCost]: cost,
    [AttrNames.ServiceMemoryUsage]: JSON.stringify(humanMemoryUsage(), null, 2),
    exData: JSON.stringify(exData, null, 2),
    exError: JSON.stringify(exError, null, 2),
  }
  trm.addEvent(span, input, { logCpuUsage: true, logMemeoryUsage: true })

  const attrs: Attributes = {
    // [AttrNames.SAMPLING_PRIORITY]: 100,
    [AttrNames.LogLevel]: 'error',
  }
  trm.setAttributes(span, attrs)
  trm.endSpan(span, {
    code: SpanStatusCode.ERROR,
    // @FIXME
    // error: exError ?? exData ?? new Error('unknown error'),
  })

  queryUidSpanMap.delete(kmoreQueryId)
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

