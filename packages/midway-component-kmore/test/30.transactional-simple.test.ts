import assert from 'node:assert'

import type { AssertsOptions } from '@mwcp/otel'
import {
  assertsSpan, assertRootSpan,
  retrieveTraceInfoFromRemote, sortSpans,
  assertJaegerParentSpanArray,
} from '@mwcp/otel'
import { SEMATTRS_HTTP_TARGET, SEMATTRS_HTTP_ROUTE } from '@opentelemetry/semantic-conventions'
import { fileShortPath } from '@waiting/shared-core'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '#@/api-test.js'
import { initDb } from '#@/helper.js'
import { testConfig } from '#@/root.config.js'


describe(fileShortPath(import.meta.url), () => {
  beforeEach(async () => { await initDb() })
  after(async () => { await initDb() })

  describe('trace transactional()', () => {
    const prefix = apiPrefix.transactional_simple

    it(apiRoute.simple, async () => {
      const { httpRequest } = testConfig
      const path = `${prefix}/${apiRoute.simple}`

      const resp = await httpRequest.get(path)
      assert(resp.ok, resp.text)

      const traceId = resp.text
      assert(traceId.length === 32)
      console.log({ traceId })

      const [info] = await retrieveTraceInfoFromRemote(traceId, 5)
      assert(info)
      // info.spans.forEach((span, idx) => { console.info(idx, { span }) })

      const [rootSpan, span1, span2, span3, span4] = sortSpans(info.spans)
      assert(rootSpan)
      assert(span1)
      assert(span2)
      assert(span3)
      assert(span4)

      assertJaegerParentSpanArray([
        { parentSpan: rootSpan, childSpan: span1 },
        { parentSpan: rootSpan, childSpan: span2 },
        { parentSpan: span2, childSpan: span3 },
        { parentSpan: span2, childSpan: span4 },
      ])

      assertRootSpan({
        path,
        span: rootSpan,
        traceId,
        tags: {
          [SEMATTRS_HTTP_TARGET]: path,
          [SEMATTRS_HTTP_ROUTE]: path,
        },
      })

      const opt1: AssertsOptions = {
        traceId,
        operationName: 'DbManager getDataSource',
        tags: {
          'caller.class': 'DbManager',
          'caller.method': 'getDataSource',
          'span.kind': 'internal',
          dbId: 'master',
        },
      }
      assertsSpan(span1, opt1)

      console.log({ span2 })
      // span2.tags.forEach((val, key) => {
      //   console.log({ key, val })
      // })
      // span2.logs.forEach((val, idx) => {
      //   console.log({ idx, val })
      // })

      const opt2: AssertsOptions = {
        traceId,
        operationName: 'Kmore master transaction',
        tags: {
          'caller.class': 'DbHookTrx',
          'caller.method': 'transactionPreHook',
          'span.kind': 'client',
          dbId: 'master',
          op: 'commit',
          'otel.status_code': 'OK',
          'trx.propagation.class': 'TransactionalSimpleRepo',
          'trx.propagation.func': 'getUserOne',
          // 'trx.propagation.path': 'src/transactional/30/30r.transactional-simple.repo.ts',
          'trx.propagation.read.rowlock.level': 'FOR_SHARE',
          'trx.propagation.type': 'REQUIRED',
          'trx.propagation.write.rowlock.level': 'FOR_UPDATE',
        },
        logs: [
          { event: 'trx.create.start' },
          { event: 'trx.create.end' },
          { event: 'trx.commit.start', dbId: 'master' },
          { event: 'trx.commit.end', dbId: 'master' },
        ],
      }
      assertsSpan(span2, opt2)

      const opt3: AssertsOptions = {
        traceId,
        operationName: 'Kmore master select',
        tags: {
          'caller.class': 'DbEvent',
          'caller.method': 'onStart',
          'span.kind': 'client',
          'db.name': 'db_ci_test',
          'db.operation': 'SELECT',
          'db.statement': 'select * from "tb_user" where "uid" = ? for share',
          'db.system': 'pg',
          'db.user': 'postgres',
          dbId: 'master',
          // 'net.peer.name': 'localhost',
          'net.peer.port': 5432,
          'otel.status_code': 'OK',
          'row.count': 1,
        },
        logs: [
          { event: 'builder.compile' },
          { event: 'query.querying', bindings: JSON.stringify([1], null, 2) },
          { event: 'query.response', 'row.count': 1 },
        ],
      }
      assertsSpan(span3, opt3)

      const opt4: AssertsOptions = {
        traceId,
        operationName: 'Kmore master select',
        tags: {
          'caller.class': 'DbEvent',
          'caller.method': 'onStart',
          'span.kind': 'client',
          'db.name': 'db_ci_test',
          'db.operation': 'SELECT',
          'db.statement': 'select * from "tb_user" for share',
          'db.system': 'pg',
          'db.user': 'postgres',
          dbId: 'master',
          // 'net.peer.name': 'localhost',
          'net.peer.port': 5432,
          'otel.status_code': 'OK',
          'row.count': 3,
        },
        logs: [
          { event: 'builder.compile' },
          { event: 'query.querying', bindings: '' },
          { event: 'query.response', 'row.count': 3 },
        ],
      }
      assertsSpan(span4, opt4)

    })

    it(`${apiRoute.simple} again`, async () => {
      const { httpRequest } = testConfig
      const path = `${prefix}/${apiRoute.simple}`

      const resp = await httpRequest.get(path)
      assert(resp.ok, resp.text)

      const traceId = resp.text
      assert(traceId.length === 32)
      console.log({ traceId })

      const [info] = await retrieveTraceInfoFromRemote(traceId, 4)
      assert(info)
      // info.spans.forEach((span, idx) => { console.info(idx, { span }) })

      const [rootSpan, span1, span2, span3] = sortSpans(info.spans)
      assert(rootSpan)
      assert(span1)
      assert(span2)
      assert(span3)

      assertJaegerParentSpanArray([
        { parentSpan: rootSpan, childSpan: span1 },
        { parentSpan: span1, childSpan: span2 },
        { parentSpan: span1, childSpan: span3 },
      ])

      assertRootSpan({
        path,
        span: rootSpan,
        traceId,
        tags: {
          [SEMATTRS_HTTP_TARGET]: path,
          [SEMATTRS_HTTP_ROUTE]: path,
        },
      })

      // const opt1: AssertsOptions = {
      //   traceId,
      //   operationName: 'DbManager getDataSource',
      //   tags: {
      //     'caller.class': 'DbManager',
      //     'caller.method': 'getDataSource',
      //     'span.kind': 'internal',
      //     dbId: 'master',
      //   },
      // }
      // assertsSpan(span1, opt1)

      const opt1: AssertsOptions = {
        traceId,
        operationName: 'Kmore master transaction',
        tags: {
          'caller.class': 'DbHookTrx',
          'caller.method': 'transactionPreHook',
          'span.kind': 'client',
          dbId: 'master',
          op: 'commit',
          'otel.status_code': 'OK',
          'trx.propagation.class': 'TransactionalSimpleRepo',
          'trx.propagation.func': 'getUserOne',
          // 'trx.propagation.path': 'src/transactional/30/30r.transactional-simple.repo.ts',
          'trx.propagation.read.rowlock.level': 'FOR_SHARE',
          'trx.propagation.type': 'REQUIRED',
          'trx.propagation.write.rowlock.level': 'FOR_UPDATE',
        },
        logs: [
          { event: 'trx.create.start' },
          { event: 'trx.create.end' },
          { event: 'trx.commit.start', dbId: 'master' },
          { event: 'trx.commit.end', dbId: 'master' },
        ],
      }
      assertsSpan(span1, opt1)

      const opt2: AssertsOptions = {
        traceId,
        operationName: 'Kmore master select',
        tags: {
          'caller.class': 'DbEvent',
          'caller.method': 'onStart',
          'span.kind': 'client',
          'db.name': 'db_ci_test',
          'db.operation': 'SELECT',
          'db.statement': 'select * from "tb_user" where "uid" = ? for share',
          'db.system': 'pg',
          'db.user': 'postgres',
          dbId: 'master',
          // 'net.peer.name': 'localhost',
          'net.peer.port': 5432,
          'otel.status_code': 'OK',
          'row.count': 1,
        },
        logs: [
          { event: 'builder.compile' },
          { event: 'query.querying', bindings: JSON.stringify([1], null, 2) },
          { event: 'query.response', 'row.count': 1 },
        ],
      }
      assertsSpan(span2, opt2)

      const opt3: AssertsOptions = {
        traceId,
        operationName: 'Kmore master select',
        tags: {
          'caller.class': 'DbEvent',
          'caller.method': 'onStart',
          'span.kind': 'client',
          'db.name': 'db_ci_test',
          'db.operation': 'SELECT',
          'db.statement': 'select * from "tb_user" for share',
          'db.system': 'pg',
          'db.user': 'postgres',
          dbId: 'master',
          // 'net.peer.name': 'localhost',
          'net.peer.port': 5432,
          'otel.status_code': 'OK',
          'row.count': 3,
        },
        logs: [
          { event: 'builder.compile' },
          { event: 'query.querying', bindings: '' },
          { event: 'query.response', 'row.count': 3 },
        ],
      }
      assertsSpan(span3, opt3)

    })
  })
})

