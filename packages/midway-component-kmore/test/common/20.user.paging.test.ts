import assert from 'node:assert/strict'

import type { AssertsOptions } from '@mwcp/otel'
import {
  assertJaegerParentSpanArray,
  assertRootSpan,
  assertsSpan,
  retrieveTraceInfoFromRemote, sortSpans,
} from '@mwcp/otel'
import { SEMATTRS_HTTP_ROUTE, SEMATTRS_HTTP_TARGET } from '@opentelemetry/semantic-conventions'
import { fileShortPath } from '@waiting/shared-core'

import { apiBase, apiMethod } from '#@/api-test.js'
import { testConfig } from '#@/root.config.js'
import type { UserDTO } from '#@/test.model.js'


describe.only(fileShortPath(import.meta.url), () => {

  const path1 = `${apiBase.user}/${apiMethod.paging}`
  it(path1, async () => {
    const { httpRequest } = testConfig

    const path = path1
    const resp = await httpRequest.get(path)
    assert(resp.ok, resp.text)

    const traceId = resp.text
    assert(traceId.length === 32)
    console.log({ traceId })

    const [info] = await retrieveTraceInfoFromRemote(traceId, 5)
    assert(info)
    // info.spans.forEach((span, idx) => {
    //   console.info(idx, { span })
    // })

    const [rootSpan, span1, span2, span3, span4] = sortSpans(info.spans)
    assert(rootSpan)
    assert(span1)
    assert(span2)
    assert(span3)
    assert(span4)

    assertRootSpan({
      path,
      span: rootSpan,
      traceId,
      tags: {
        [SEMATTRS_HTTP_TARGET]: path,
        [SEMATTRS_HTTP_ROUTE]: path,
      },
      mergeDefaultLogs: false,
    })

    assertJaegerParentSpanArray([
      { parentSpan: rootSpan, childSpan: span1 },
      { parentSpan: rootSpan, childSpan: span2 },
      { parentSpan: span2, childSpan: span3 },
      { parentSpan: span2, childSpan: span4 },
    ])

    const opt2: AssertsOptions = {
      traceId,
      operationName: 'Kmore master select AutoPaging',
      tags: {
        'caller.class': 'DbEvent',
        'caller.method': 'onStart',
        'span.kind': 'client',
      },
    }
    assertsSpan(span2, opt2)

    const opt3: AssertsOptions = {
      traceId,
      operationName: 'Kmore Counter',
      tags: {
        'db.operation': 'SELECT',
        'db.statement': 'select count(*) as "total" from "tb_user" limit ?',
        'row.count': 1,
      },
      logs: [
        { event: 'builder.compile' },
        { event: 'query.querying', bindings: JSON.stringify([1], null, 2) },
        { event: 'query.response', 'query.response': JSON.stringify([{ total: '3' }], null, 2), 'row.count': 1 },
      ],
    }
    assertsSpan(span3, opt3)

    const opt4: AssertsOptions = {
      traceId,
      operationName: 'Kmore Pager',
      tags: {
        'caller.class': 'DbEvent',
        'caller.method': 'onStart',

        'span.kind': 'client',
        'db.operation': 'SELECT',
        'db.statement': 'select * from "tb_user" limit ?',
        'row.count': 3,
      },
      logs: [
        { event: 'builder.compile' },
        { event: 'query.querying', bindings: JSON.stringify([3], null, 2) }, // total 3, pageSize 10, so use 3
        { event: 'query.response', 'row.count': 3 },
      ],
    }
    assertsSpan(span4, opt4)
  })

  it.only('Should work with transaction', async () => {
    const { httpRequest } = testConfig

    const path = '/user/paging_trx'
    const resp = await httpRequest.get(path)
    assert(resp.ok, resp.text)
    const ret = resp.body as UserDTO[]
    assert(Array.isArray(ret))
    assert(ret.length)
  })

})

