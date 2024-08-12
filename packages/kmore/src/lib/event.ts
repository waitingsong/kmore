/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import type { KmoreQueryBuilder } from './builder/builder.types.js'
import { processJoinTableColumnAlias } from './builder/smart-join.js'
import { initKmoreEvent } from './config.js'
import type { EventCallbacks, Kmore, KmoreEvent } from './kmore.js'
import type {
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryResponse,
} from './types.js'


export interface CallCbOptionsBase {
  kmore: Kmore
  builder: KmoreQueryBuilder
}

// export interface CallCbOnStartOptions extends CallCbOptionsBase {
//   builder: KmoreQueryBuilder
// }

export function callCbOnStart(options: CallCbOptionsBase): void {
  const { kmore, builder } = options
  const queryBuilder = processJoinTableColumnAlias(options.builder)
  const cb: EventCallbacks['start'] = kmore.eventCallbacks?.start

  if (typeof cb === 'function') {
    const event = processKnexOnEvent({
      type: 'start',
      data: void 0,
      queryUid: '',
      queryBuilder,
      kmoreQueryId: builder.kmoreQueryId,
    })
    event.dbId = kmore.dbId
    cb(event, kmore)
  }
}

export interface CallCbOnQueryOptions extends CallCbOptionsBase {
  data: OnQueryData
}

export function callCbOnQuery(options: CallCbOnQueryOptions): void {
  const { kmore, builder } = options
  const cb: EventCallbacks['query'] = kmore.eventCallbacks?.query
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(options.data)
    const event = processKnexOnEvent({
      type: 'query',
      data: options.data,
      queryUid,
      queryBuilder: builder,
      kmoreQueryId: builder.kmoreQueryId,
    })
    event.dbId = kmore.dbId
    cb(event, kmore); return
  }
}

export interface CallCbOnQueryRespOptions extends CallCbOptionsBase {
  _resp: QueryResponse
  respRaw: OnQueryRespRaw
}

export function callCbOnQueryResp(options: CallCbOnQueryRespOptions): void {
  const { kmore, builder } = options
  const cb: EventCallbacks['queryResponse'] = kmore.eventCallbacks?.queryResponse
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(options.respRaw)
    const event = processKnexOnEvent({
      type: 'queryResponse',
      respRaw: options.respRaw,
      queryUid,
      queryBuilder: builder,
      kmoreQueryId: builder.kmoreQueryId,
    })
    event.dbId = kmore.dbId
    cb(event, kmore)
  }
}

export interface CallCbOnQueryErrorOptions extends CallCbOptionsBase {
  err: OnQueryErrorErr
  data: OnQueryErrorData
}

export function callCbOnQueryError(options: CallCbOnQueryErrorOptions): void | Promise<void> {
  const { kmore, builder } = options
  const cb: EventCallbacks['queryError'] = kmore.eventCallbacks?.queryError
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(options.data)
    const event = processKnexOnEvent({
      type: 'queryError',
      exError: options.err,
      exData: options.data,
      queryUid,
      queryBuilder: builder,
      kmoreQueryId: builder.kmoreQueryId,
    })
    event.dbId = builder.dbId
    return cb(event, kmore)
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
      const { data } = input
      assert(data, 'data should be set on query event')
      ev.method = data.method ? data.method : ''
      ev.kUid = data.__knexUid
      ev.trxId = data.__knexTxId ? data.__knexTxId : void 0
      break
    }

    case 'queryResponse': {
      const data = input.respRaw
      assert(data, 'data should be set on queryResponse event')
      ev.method = data.method ? data.method : ''
      ev.command = data.response?.command
      ev.kUid = data.__knexUid
      ev.trxId = data.__knexTxId ? data.__knexTxId : void 0
      break
    }

    case 'queryError': {
      const data = input.exData
      assert(data, 'data should be set on queryError event')
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

