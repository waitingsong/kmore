/* eslint-disable @typescript-eslint/no-explicit-any */
import { initKmoreEvent } from './config.js'
import {
  EventCallbacks,
  KmoreEvent,
  KmoreQueryBuilder,
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
  identifier: unknown
  kmoreQueryId: symbol
}

export interface CallCbOnStartOptions<Ctx = any> extends CallCbOptionsBase<Ctx> {
  builder: KmoreQueryBuilder
}

export async function callCbOnStart(options: CallCbOnStartOptions): Promise<void> {
  const cb: EventCallbacks['start'] = options.cbs?.start

  if (typeof cb === 'function') {
    const event = processKnexOnEvent({
      type: 'start',
      identifier: options.identifier,
      data: void 0,
      queryUid: '',
      queryBuilder: options.builder,
    })
    event.dbId = options.dbId
    await cb(event, options.ctx)
  }
}

export interface CallCbOnQueryOptions<Ctx = any> extends CallCbOptionsBase<Ctx> {
  data: OnQueryData
}

export async function callCbOnQuery(options: CallCbOnQueryOptions): Promise<void> {
  const cb: EventCallbacks['query'] = options.cbs?.query
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(options.data)
    const event = processKnexOnEvent({
      type: 'query',
      identifier: options.identifier,
      data: options.data,
      queryUid,
      queryBuilder: void 0,
    })
    event.dbId = options.dbId
    await cb(event, options.ctx)
  }
}

export interface CallCbOnQueryRespOptions<Ctx = any> extends CallCbOptionsBase<Ctx> {
  _resp: QueryResponse
  respRaw: OnQueryRespRaw
}

export async function callCbOnQueryResp(options: CallCbOnQueryRespOptions): Promise<void> {
  const cb: EventCallbacks['queryResponse'] = options.cbs?.queryResponse
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(options.respRaw)
    const event = processKnexOnEvent({
      type: 'queryResponse',
      identifier: options.identifier,
      respRaw: options.respRaw,
      queryUid,
      queryBuilder: void 0,
    })
    event.dbId = options.dbId
    await cb(event, options.ctx)
  }
}

export interface CallCbOnQueryErrorOptions<Ctx = any> extends CallCbOptionsBase<Ctx> {
  err: OnQueryErrorErr
  data: OnQueryErrorData
}

export async function callCbOnQueryError(options: CallCbOnQueryErrorOptions): Promise<void> {
  const cb: EventCallbacks['queryError'] = options.cbs?.queryError
  if (typeof cb === 'function') {
    const queryUid = pickQueryUidFrom(options.data)
    const event = processKnexOnEvent({
      type: 'queryError',
      identifier: options.identifier,
      exError: options.err,
      exData: options.data,
      queryUid,
      queryBuilder: void 0,
    })
    event.dbId = options.dbId
    await cb(event, options.ctx)
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

