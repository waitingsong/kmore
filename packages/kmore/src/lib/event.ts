import { Observable, Subject } from 'rxjs'

import { initKmoreEvent } from './config'
import {
  KmoreEvent,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryResponse,
} from './types'


export const globalSubject: Subject<KmoreEvent> = new Subject()
export const globalEvent: Observable<KmoreEvent> = globalSubject.asObservable()

export function bindOnQuery(
  subject: Subject<KmoreEvent>,
  identifier: unknown,
  data: OnQueryData,
): void {

  const queryUid = pickQueryUidFrom(data)
  processKnexOnEvent(
    subject,
    {
      type: 'query',
      identifier,
      data,
      queryUid,
    },
  )
}

export function bindOnQueryResp(
  subject: Subject<KmoreEvent>,
  identifier: unknown,
  _: QueryResponse,
  respRaw:
  OnQueryRespRaw,
): void {

  const queryUid = pickQueryUidFrom(respRaw)
  processKnexOnEvent(
    subject,
    {
      type: 'queryResponse',
      identifier,
      respRaw,
      queryUid,
    },
  )
}

export function bindOnQueryError(
  subject: Subject<KmoreEvent>,
  identifier: unknown,
  err: OnQueryErrorErr,
  data: OnQueryErrorData,
): void {

  const queryUid = pickQueryUidFrom(data)
  processKnexOnEvent(
    subject,
    {
      type: 'queryError',
      identifier,
      exError: err,
      exData: data,
      queryUid,
    },
  )
}


function processKnexOnEvent(
  subject: Subject<KmoreEvent>,
  input: Partial<KmoreEvent>,
): void {

  if (! subject || typeof subject.next !== 'function') {
    throw new TypeError('Subject invalid')
  }
  if (subject.closed) {
    // throw new Error('Kmore:subject already closed')
    console.warn({
      msg: 'Kmore event:subject already closed. skip tracing.',
      input,
    })
    return
  }

  const ev: KmoreEvent = {
    ...initKmoreEvent,
    ...input,
    timestamp: Date.now(),
  }
  if (ev.type === 'query') {
    const data = input.data as OnQueryData
    ev.method = data.method ? data.method : ''
    ev.kUid = data.__knexUid
    ev.trxId = data.__knexTxId ? data.__knexTxId : void 0
  }
  else if (ev.type === 'queryResponse') {
    const data = input.respRaw as OnQueryRespRaw
    ev.method = data.method ? data.method : ''
    ev.command = data.response?.command
    ev.kUid = data.__knexUid
    ev.trxId = data.__knexTxId ? data.__knexTxId : void 0
  }
  else if (ev.type === 'queryError') {
    const data = input.exData as OnQueryErrorData
    ev.method = data.method
    ev.kUid = data.__knexUid
    ev.trxId = data.__knexTxId ? data.__knexTxId : void 0
  }

  subject.next(ev)
}

function pickQueryUidFrom(input: OnQueryData | OnQueryErrorData | OnQueryRespRaw): string {
  return input.__knexQueryUid ? input.__knexQueryUid : ''
}

