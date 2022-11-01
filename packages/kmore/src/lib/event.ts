/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'assert'

import type { KmoreQueryBuilder } from './builder.types.js'
import { initKmoreEvent } from './config.js'
import { processJoinTableColumnAlias } from './smart-join.js'
import {
  EventCallbacks,
  KmoreEvent,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryResponse,
} from './types.js'


export interface CallCbOptionsBase<Ctx = any> {
  ctx: Ctx | undefined
  dbId: string
  cbs: EventCallbacks<Ctx> | undefined
  kmoreQueryId: symbol
}

export interface CallCbOnStartOptions<Ctx = any> extends CallCbOptionsBase<Ctx> {
  builder: KmoreQueryBuilder
}

export function callCbOnStart(options: CallCbOnStartOptions): void {
  const queryBuilder = processJoinTableColumnAlias(options.builder)
  const cb: EventCallbacks['start'] = options.cbs?.start

  if (typeof cb === 'function') {
    const event = processKnexOnEvent({
      type: 'start',
      data: void 0,
      queryUid: '',
      queryBuilder,
      kmoreQueryId: options.kmoreQueryId,
    })
    event.dbId = options.dbId
    return cb(event, options.ctx)
  }
}

export interface CallCbOnQueryOptions<Ctx = any> extends CallCbOptionsBase<Ctx> {
  data: OnQueryData
}

export function callCbOnQuery(options: CallCbOnQueryOptions): void {
  const cb: EventCallbacks['query'] = options.cbs?.query
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(options.data)
    const event = processKnexOnEvent({
      type: 'query',
      data: options.data,
      queryUid,
      queryBuilder: void 0,
      kmoreQueryId: options.kmoreQueryId,
    })
    event.dbId = options.dbId
    return cb(event, options.ctx)
  }
}

export interface CallCbOnQueryRespOptions<Ctx = any> extends CallCbOptionsBase<Ctx> {
  _resp: QueryResponse
  respRaw: OnQueryRespRaw
}

export function callCbOnQueryResp(options: CallCbOnQueryRespOptions): void {
  const cb: EventCallbacks['queryResponse'] = options.cbs?.queryResponse
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(options.respRaw)
    const event = processKnexOnEvent({
      type: 'queryResponse',
      respRaw: options.respRaw,
      queryUid,
      queryBuilder: void 0,
      kmoreQueryId: options.kmoreQueryId,
    })
    event.dbId = options.dbId
    return cb(event, options.ctx)
  }
}

export interface CallCbOnQueryErrorOptions<Ctx = any> extends CallCbOptionsBase<Ctx> {
  err: OnQueryErrorErr
  data: OnQueryErrorData
}

export function callCbOnQueryError(options: CallCbOnQueryErrorOptions): void | Promise<void> {
  const cb: EventCallbacks['queryError'] = options.cbs?.queryError
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(options.data)
    const event = processKnexOnEvent({
      type: 'queryError',
      exError: options.err,
      exData: options.data,
      queryUid,
      queryBuilder: void 0,
      kmoreQueryId: options.kmoreQueryId,
    })
    event.dbId = options.dbId
    return cb(event, options.ctx)
  }
}


function processKnexOnEvent(input: Partial<KmoreEvent>): KmoreEvent {
  const ev = {
    ...initKmoreEvent,
    ...input,
    timestamp: Date.now(),
  } as KmoreEvent
  assert(ev.kmoreQueryId, 'kmoreQueryId is required')

  switch (ev.type) {
    case 'start': {
      break
    }

    case 'query': {
      const data = input.data as OnQueryData
      ev.method = data.method ? data.method : ''
      ev.kUid = data.__knexUid
      ev.trxId = data.__knexTxId ? data.__knexTxId : void 0
      break
    }

    case 'queryResponse': {
      const data = input.respRaw as OnQueryRespRaw
      ev.method = data.method ? data.method : ''
      ev.command = data.response?.command
      ev.kUid = data.__knexUid
      ev.trxId = data.__knexTxId ? data.__knexTxId : void 0
      break
    }

    case 'queryError': {
      const data = input.exData as OnQueryErrorData
      ev.method = data.method
      ev.kUid = data.__knexUid
      ev.trxId = data.__knexTxId ? data.__knexTxId : void 0
      break
    }

    default:
      break
  }

  return ev
}

function pickQueryUidFrom(input: OnQueryData | OnQueryErrorData | OnQueryRespRaw): string {
  return input.__knexQueryUid ? input.__knexQueryUid : ''
}

