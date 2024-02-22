import assert from 'node:assert'

import type { KmoreBase } from './base.js'
import type { KmoreQueryBuilder } from './builder.types.js'
import {
  callCbOnQuery,
  callCbOnQueryError,
  callCbOnQueryResp,
  callCbOnStart,
  CallCbOptionsBase,
} from './event.js'
import {
  CaseType,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryContext,
  QueryResponse,
} from './types.js'


export function builderBindEvents(
  kmore: KmoreBase,
  refTable: KmoreQueryBuilder,
  caseConvert: CaseType,
  ctx: unknown,
  kmoreQueryId: symbol,
): KmoreQueryBuilder {

  assert(caseConvert, 'caseConvert must be defined')

  const queryCtxOpts: QueryContext = {
    wrapIdentifierCaseConvert: kmore.wrapIdentifierCaseConvert,
    wrapIdentifierIgnoreRule: kmore.wrapIdentifierIgnoreRule,
    postProcessResponseCaseConvert: caseConvert,
    kmoreQueryId,
    columns: [],
  }
  const opts: CallCbOptionsBase = {
    ctx,
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
        return callCbOnStart({
          ...opts,
          builder,
        })
      },
    )
    .on(
      'query',
      (data: OnQueryData) => callCbOnQuery({
        ...opts,
        data,
      }),
    )
    .on(
      'query-response',
      (resp: QueryResponse, respRaw: OnQueryRespRaw) => callCbOnQueryResp({
        ...opts,
        _resp: resp,
        respRaw,
      }),
    )
    .on(
      'query-error',
      async (err: OnQueryErrorErr, data: OnQueryErrorData) => {
        const trx = kmore.getTrxByKmoreQueryId(kmoreQueryId)
        await kmore.finishTransaction(trx)
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

