import type { Knex } from 'knex'

import { initKmoreEvent } from './config.js'
import {
  EventCallbacks,
  KmoreEvent,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryResponse,
} from './types.js'


export async function callCbOnStart<Ctx = unknown>(
  ctx: Ctx | undefined,
  dbId: string,
  cbs: EventCallbacks<Ctx> | undefined,
  identifier: unknown,
  builder: Knex.QueryBuilder,
): Promise<void> {

  const cb: EventCallbacks<Ctx>['start'] = cbs?.start
  if (typeof cb === 'function') {
    const event = processKnexOnEvent({
      type: 'start',
      identifier,
      data: void 0,
      queryUid: '',
      queryBuilder: builder,
    })
    event.dbId = dbId
    await cb(event, ctx)
  }
}

export async function callCbOnQuery<Ctx = unknown>(
  ctx: Ctx | undefined,
  dbId: string,
  cbs: EventCallbacks<Ctx> | undefined,
  identifier: unknown,
  data: OnQueryData,
): Promise<void> {

  const cb: EventCallbacks<Ctx>['query'] = cbs?.query
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(data)
    const event = processKnexOnEvent({
      type: 'query',
      identifier,
      data,
      queryUid,
      queryBuilder: void 0,
    })
    event.dbId = dbId
    await cb(event, ctx)
  }
}

export async function callCbOnQueryResp<Ctx = unknown>(
  ctx: Ctx | undefined,
  dbId: string,
  cbs: EventCallbacks<Ctx> | undefined,
  identifier: unknown,
  _resp: QueryResponse, // not used
  respRaw: OnQueryRespRaw,
): Promise<void> {

  const cb: EventCallbacks<Ctx>['queryResponse'] = cbs?.queryResponse
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(respRaw)
    const event = processKnexOnEvent({
      type: 'queryResponse',
      identifier,
      respRaw,
      queryUid,
      queryBuilder: void 0,
    })
    event.dbId = dbId
    await cb(event, ctx)
  }
}

export async function callCbOnQueryError<Ctx = unknown>(
  ctx: Ctx | undefined,
  dbId: string,
  cbs: EventCallbacks<Ctx> | undefined,
  identifier: unknown,
  err: OnQueryErrorErr,
  data: OnQueryErrorData,
): Promise<void> {

  const cb: EventCallbacks<Ctx>['queryError'] = cbs?.queryError
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(data)
    const event = processKnexOnEvent({
      type: 'queryError',
      identifier,
      exError: err,
      exData: data,
      queryUid,
      queryBuilder: void 0,
    })
    event.dbId = dbId
    await cb(event, ctx)
  }
}


function processKnexOnEvent(input: Partial<KmoreEvent>): KmoreEvent {
  const ev: KmoreEvent = {
    ...initKmoreEvent,
    ...input,
    timestamp: Date.now(),
  }

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

