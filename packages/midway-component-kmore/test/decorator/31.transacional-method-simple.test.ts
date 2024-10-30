import assert from 'node:assert'

import type { AssertsOptions } from '@mwcp/otel'
import {
  assertJaegerParentSpanArray,
  assertRootSpan,
  assertsSpan,
  retrieveTraceInfoFromRemote, sortSpans,
} from '@mwcp/otel'
import { SEMATTRS_HTTP_ROUTE, SEMATTRS_HTTP_TARGET } from '@opentelemetry/semantic-conventions'
import { fileShortPath } from '@waiting/shared-core'

import { KmoreAttrNames } from '##/index.js'
import { apiBase as apiPrefix, apiMethod as apiRoute } from '#@/api-test.js'
import { initDb } from '#@/helper.js'
import { testConfig } from '#@/root.config.js'


describe(fileShortPath(import.meta.url), () => {
  beforeEach(async () => { await initDb() })
  after(async () => { await initDb() })

  describe('trace transactional()', () => {
    const prefix = apiPrefix.decorator

    it(apiRoute.simple, async () => {
      const { httpRequest } = testConfig
      const path = `${prefix}/${apiRoute.simple}`

      const resp = await httpRequest.get(path)
      assert(resp.ok, resp.text)

      const traceId = resp.text
      assert(traceId.length === 32)
      console.log({ traceId })

      const [info] = await retrieveTraceInfoFromRemote(traceId, 8)
      assert(info)
      // info.spans.forEach((span, idx) => { console.info(idx, { span }) })

      const [rootSpan, span1, span2, span3, span4, span5, span6, span7] = sortSpans(info.spans)
      assert(rootSpan)
      assert(span1)
      assert(span2)
      assert(span3)
      assert(span4)
      assert(span5)
      assert(span6)
      assert(span7)

      assertJaegerParentSpanArray([
        { parentSpan: rootSpan, childSpan: span1 },
        { parentSpan: rootSpan, childSpan: span2 },
        { parentSpan: rootSpan, childSpan: span3 },
        { parentSpan: span4, childSpan: span5 },
        { parentSpan: span4, childSpan: span6 },
        { parentSpan: span4, childSpan: span7 },
      ])

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

      const opt2: AssertsOptions = {
        traceId,
        operationName: 'Kmore master transaction',
        tags: {
          'caller.class': 'DbHookTrx',
          'caller.method': 'transactionPreHook',
          'span.kind': 'client',
          dbId: 'master',
          op: 'rollback',
          'otel.status_code': 'OK',
        },
        logs: [
          { event: 'trx.create.start' },
          { event: 'trx.create.end' },
          { event: 'trx.rollback.start', dbId: 'master' },
          { event: 'trx.rollback.end', dbId: 'master' },
        ],
      }
      assertsSpan(span2, opt2)

      const opt3: AssertsOptions = {
        traceId,
        operationName: 'Kmore master transaction',
        tags: {
          'caller.class': 'DbHookTrx',
          'caller.method': 'transactionPreHook',
          'span.kind': 'client',
          dbId: 'master',
          op: 'commit',
          'otel.status_code': 'OK',
        },
        logs: [
          { event: 'trx.create.start' },
          { event: 'trx.create.end' },
          { event: 'trx.commit.start', dbId: 'master' },
          { event: 'trx.commit.end', dbId: 'master' },
        ],
      }
      assertsSpan(span3, opt3)

      const opt4: AssertsOptions = {
        traceId,
        operationName: 'Kmore master transaction',
        tags: {
          'caller.class': 'DbHookTrx',
          'caller.method': 'transactionPreHook',
          'span.kind': 'client',
          dbId: 'master',
          op: 'commit',
          'otel.status_code': 'OK',
          'trx.propagation.class': 'UserRepo',
          'trx.propagation.func': 'getUserOne',
          // 'trx.propagation.path': 'src/transactional/31/31r.method-decorator-simple.repo.ts',
          'trx.propagation.read.rowlock.level': 'FOR_SHARE',
          'trx.propagation.type': 'REQUIRED',
          'trx.propagation.write.rowlock.level': 'FOR_UPDATE',
        },
        logs: [
          { event: 'trx.create.start' },
          { event: 'trx.create.end' },
          { event: KmoreAttrNames.BuilderTransacting, method: 'select', table: 'tb_user' },
          { event: KmoreAttrNames.BuilderTransacting, method: 'select', table: 'tb_user' },
          { event: KmoreAttrNames.BuilderTransacting, method: 'select', table: 'tb_user' },
          { event: 'trx.commit.start', dbId: 'master' },
          { event: 'trx.commit.end', dbId: 'master' },
        ],
      }
      assertsSpan(span4, opt4)

      const opt5: AssertsOptions = {
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
      assertsSpan(span5, opt5)

      const opt6: AssertsOptions = {
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
      assertsSpan(span6, opt6)

      const opt7: AssertsOptions = {
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
      assertsSpan(span7, opt7)

    })
  })
})

