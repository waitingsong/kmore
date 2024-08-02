import assert from 'node:assert'

import type { CallCbOptionsBase } from '../event.js'
import {
  callCbOnQuery,
  callCbOnQueryError,
  callCbOnQueryResp,
  callCbOnStart,
} from '../event.js'
import type { Kmore } from '../kmore.js'
import type {
  CaseType,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryContext,
  QueryResponse,
} from '../types.js'

import type { KmoreQueryBuilder } from './builder.types.js'


interface BuilderBindEventsOptions {
  kmore: Kmore
  builder: KmoreQueryBuilder
  caseConvert: CaseType
  kmoreQueryId: symbol
}

export function builderBindEvents(options: BuilderBindEventsOptions): KmoreQueryBuilder {
  const {
    kmore,
    builder: refTable,
    caseConvert,
    kmoreQueryId,
  } = options

  assert(caseConvert, 'caseConvert must be defined')

  const queryCtxOpts: QueryContext = {
    wrapIdentifierCaseConvert: kmore.wrapIdentifierCaseConvert,
    wrapIdentifierIgnoreRule: kmore.wrapIdentifierIgnoreRule,
    postProcessResponseCaseConvert: caseConvert,
    kmoreQueryId,
    columns: [],
  }
  const opts: CallCbOptionsBase = {
    ctx: kmore,
    dbId: kmore.dbId,
    cbs: kmore.eventCallbacks,
    kmoreQueryId,
  }

  const refTable2 = refTable
    .queryContext(queryCtxOpts)
    .on(
      'start',
      (builder: KmoreQueryBuilder) => {
        const columns2 = pickColumnsFromBuilder(builder)
        if (columns2.length) {
          columns2.forEach(row => queryCtxOpts.columns.push(row))
        }
        callCbOnStart({
          ...opts,
          builder,
        })
      },
    )
    .on(
      'query',
      (data: OnQueryData) => {
        callCbOnQuery({
          ...opts,
          data,
        })
      },
    )
    .on(
      'query-response',
      (resp: QueryResponse, respRaw: OnQueryRespRaw) => {
        callCbOnQueryResp({
          ...opts,
          _resp: resp,
          respRaw,
        })
      },
    )
    .on(
      'query-error',
      async (err: OnQueryErrorErr, data: OnQueryErrorData) => {
        const trx = kmore.getTrxByQueryId(kmoreQueryId)
        await kmore.finishTransaction({ trx })
        return callCbOnQueryError({
          ...opts,
          err,
          data,
        })
      },
    )
  // .on('error', (ex: unknown) => {
  //   void ex
  // })
  // .on('end', () => {
  //   void 0
  // })

  return refTable2 as KmoreQueryBuilder
}

function pickColumnsFromBuilder(builder: KmoreQueryBuilder): Record<string, string>[] {
  const ret: Record<string, string>[] = []

  // @ts-ignore
  const statements = builder._statements as { grouping: string, value: unknown }[]
  if (Array.isArray(statements) && statements.length) {
    statements.forEach((statement) => {
      if (statement.grouping !== 'columns') { return }

      const { value } = statement
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string') {
            ret.push({ [item]: item })
          }
          else if (typeof item === 'object') {
            ret.push(item as Record<string, string>)
          }
        })
      }
    })
  }
  return ret
}

