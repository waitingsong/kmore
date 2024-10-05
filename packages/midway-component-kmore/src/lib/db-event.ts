import assert from 'node:assert'

import {
  App,
  ApplicationContext,
  IMidwayContainer,
  Inject,
  Singleton,
} from '@midwayjs/core'
import {
  AttrNames,
  Attributes,
  DecoratorTraceData,
  SpanStatusCode,
  StartScopeActiveSpanOptions,
  Trace,
  TraceLog,
  TraceScopeType,
} from '@mwcp/otel'
import { Application, Context, MConfig, getWebContext } from '@mwcp/share'
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  SEMATTRS_DB_NAME,
  SEMATTRS_DB_OPERATION,
  SEMATTRS_DB_STATEMENT,
  SEMATTRS_DB_SYSTEM,
  SEMATTRS_DB_USER,
  SEMATTRS_NET_PEER_NAME,
  SEMATTRS_NET_PEER_PORT,
} from '@opentelemetry/semantic-conventions'
import { humanMemoryUsage } from '@waiting/shared-core'
import type { Kmore, KmoreEvent, KmoreQueryBuilder } from 'kmore'

import { eventNeedTrace, genCommonAttr } from './trace.helper.js'
import { TrxStatusService } from './trx-status.service.js'
import { ConfigKey, ConnectionConfig, DbConfig, KmoreAttrNames, KmoreSourceConfig } from './types.js'


@Singleton()
export class DbEvent<SourceName extends string = string> {

  @MConfig(ConfigKey.config) private readonly sourceConfig: KmoreSourceConfig<SourceName>

  @App() readonly app: Application
  @ApplicationContext() readonly applicationContext: IMidwayContainer

  @Inject() readonly appDir: string
  @Inject() readonly baseDir: string

  @Inject() readonly trxStatusSvc: TrxStatusService


  getDbConfigByDbId(dbId: SourceName): DbConfig | undefined {
    assert(dbId)
    const dbConfig = this.sourceConfig.dataSource[dbId]
    return dbConfig
  }

  getWebContext(): Context | undefined {
    return getWebContext(this.applicationContext)
  }

  getWebContextThenApp(): Context | Application {
    try {
      const webContext = getWebContext(this.applicationContext)
      assert(webContext, 'getActiveContext() webContext should not be null, maybe this calling is not in a request context')
      return webContext
    }
    catch (ex) {
      console.warn('getWebContextThenApp() failed', ex)
      return this.app
    }
  }

  // #region onStart

  @Trace<DbEvent['onStart']>({
    autoEndSpan: false,
    spanName: ([options]) => {
      const { kmore, event } = options
      // @ts-expect-error builder._method
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      let method = event.command?.toLowerCase() ?? event.queryBuilder._method ?? 'unknown'
      if (method === 'del') {
        method = 'delete'
      }
      const name = `Kmore ${kmore.dbId} ${method}`
      return name
    },
    scope([options]) {
      const { kmore, event } = options
      const { kmoreQueryId, queryBuilder } = event
      const traceScope = this.retrieveTraceScope(kmore, kmoreQueryId, queryBuilder)
      return traceScope
    },
    before: ([options], decoratorContext) => {
      if (! eventNeedTrace(KmoreAttrNames.BuilderCompile, options.dbConfig)) { return }
      const { event } = options
      const { queryBuilder } = event
      const { pagingType } = queryBuilder
      const { traceSpan } = decoratorContext
      const ret: DecoratorTraceData = {}

      if (pagingType && traceSpan) {
        const { traceService, traceScope, traceContext } = decoratorContext
        if (pagingType === 'counter') {
          // @ts-expect-error name
          const spanName = traceSpan.name as string
          const spanName2 = `${spanName} AutoPaging`
          if (! spanName.endsWith('AutoPaging')) {
            traceSpan.updateName(spanName2)
          }

          const opts: StartScopeActiveSpanOptions = {
            name: 'Kmore Counter',
            scope: traceScope,
            traceContext,
          }
          assert(traceService, 'traceService is empty')
          const { span, traceContext: traceCtx2 } = traceService.startScopeActiveSpan(opts)
          void span
          ret.traceContext = traceCtx2
        }
        else {
          const spanName2 = 'Kmore Pager'
          traceSpan.updateName(spanName2)
        }
      }

      const events = genCommonAttr(KmoreAttrNames.BuilderCompile)
      ret.events = events
      return ret
    },
  })
  onStart(this: DbEvent, options: OnEventOptions): void {
    const { dbConfig, event, kmore } = options
    assert(dbConfig)
    assert(event.type === 'start', event.type)
    assert(event.queryBuilder)

    // if (event.queryBuilder) {
    //   void Object.defineProperty(event.queryBuilder, 'eventProcessed', {
    //     value: true,
    //   })
    // }

    const cb = dbConfig.eventCallbacks?.start
    return cb?.(event, kmore)
  }

  // #region onResp

  @TraceLog<DbEvent['onResp']>({
    scope([options]) {
      const { kmore, event } = options
      // const traceScope = this.getTrxTraceScopeByQueryId(kmore, event.kmoreQueryId)
      // if (traceScope) {
      //   return traceScope
      // }
      // const traceScope2 = event.queryBuilder.kmoreQueryId
      const traceScope = this.retrieveTraceScope(kmore, event.kmoreQueryId, event.queryBuilder)
      return traceScope
    },
    before: ([options]) => {
      if (! eventNeedTrace(KmoreAttrNames.QueryResponse, options.dbConfig)) { return }

      const { respRaw } = options.event

      const attrs: Attributes = {}
      if (respRaw?.response?.command) {
        attrs[SEMATTRS_DB_OPERATION] = respRaw.response.command
        attrs[AttrNames.QueryRowCount] = respRaw.response.rowCount ?? 0
        // attrs[AttrNames.QueryResponse] = JSON.stringify(respRaw.response.rows, null, 2)
      }

      const events = genCommonAttr(KmoreAttrNames.QueryResponse)
      if (respRaw?.response) {
        events[AttrNames.QueryRowCount] = respRaw.response.rowCount ?? 0
        events[AttrNames.QueryResponse] = JSON.stringify(respRaw.response.rows, null, 2)
      }

      return { attrs, events }
    },
    after([options], _result, decoratorContext) {
      if (! eventNeedTrace(KmoreAttrNames.QueryResponse, options.dbConfig)) { return }

      const { traceService, traceScope, traceSpan } = decoratorContext
      assert(traceService, 'traceService is empty')
      assert(traceScope, 'onResp.after() traceScope is empty')
      assert(traceSpan, 'traceSpan is empty')

      const ret: DecoratorTraceData = {}

      const { pagingType } = options.event.queryBuilder
      if (pagingType && pagingType !== 'counter') {
        ret.endParentSpan = true
      }

      const scopeRootSpan = traceService.getActiveSpanOnlyScope(traceScope)
      // const foo = traceService.retrieveParentTraceInfoBySpan(traceSpan, traceScope)
      // void foo

      if (scopeRootSpan && scopeRootSpan === traceSpan) {
        ret.endSpanAfterTraceLog = true
      }
      return ret
    },
  })
  onResp(this: DbEvent, options: OnEventOptions): void {
    const { dbConfig, event, kmore } = options
    assert(dbConfig)
    assert(event.type === 'queryResponse', event.type)
    assert(event.respRaw)

    const cb = dbConfig.eventCallbacks?.queryResponse
    return cb?.(event, kmore)
  }

  // #region onQuery

  @TraceLog<DbEvent['onQuery']>({
    scope([options]) {
      const { kmore, event } = options
      const traceScope = this.retrieveTraceScope(kmore, event.kmoreQueryId, event.queryBuilder)
      return traceScope
    },
    before([options], decoratorContext) {
      if (! eventNeedTrace(KmoreAttrNames.QueryQuerying, options.dbConfig)) { return }

      const { traceService, traceScope, traceSpan } = decoratorContext
      assert(traceService, 'traceService is empty')
      assert(traceScope, 'onQuery.after() traceScope is empty')
      assert(traceSpan, 'traceSpan is empty')

      const { config: knexConfig } = options.dbConfig
      const conn = knexConfig.connection as ConnectionConfig
      const { dbId, kUid, queryUid, trxId, data } = options.event

      const attrs: Attributes = {
        dbId,
        [SEMATTRS_DB_SYSTEM]: typeof knexConfig.client === 'string'
          ? knexConfig.client
          : JSON.stringify(knexConfig.client, null, 2),
        [SEMATTRS_NET_PEER_NAME]: conn.host,
        [SEMATTRS_DB_NAME]: conn.database,
        [SEMATTRS_NET_PEER_PORT]: conn.port ?? '',
        [SEMATTRS_DB_USER]: conn.user,
        // [AttrNames.QueryCostThrottleInMS]: sampleThrottleMs,
        kUid,
        queryUid,
        trxId: trxId ?? '',
        [SEMATTRS_DB_STATEMENT]: data?.sql ?? '',
      }

      const bindings = data?.bindings?.length ? JSON.stringify(data.bindings, null, 2) : void 0
      const events = genCommonAttr(KmoreAttrNames.QueryQuerying, { bindings, kUid })

      return { attrs, events }
    },
  })
  onQuery(this: DbEvent, options: OnEventOptions): void {
    const { dbConfig, event, kmore } = options
    assert(dbConfig)
    assert(event.type === 'query', event.type)
    assert(event.data)

    const cb = dbConfig.eventCallbacks?.query
    return cb?.(event, kmore)
  }


  // #region onError

  @TraceLog<DbEvent['onError']>({
    scope([options]) {
      const { kmore, event } = options
      const traceScope = this.retrieveTraceScope(kmore, event.kmoreQueryId, event.queryBuilder)
      return traceScope
    },
    before([options]) {
      if (! eventNeedTrace(KmoreAttrNames.QueryError, options.dbConfig)) { return }

      const {
        dbId, kUid, queryUid, trxId, exData, exError,
      } = options.event

      const events = genCommonAttr(KmoreAttrNames.QueryError, {
        level: 'error',
        dbId,
        kUid,
        queryUid,
        trxId,
        [AttrNames.ServiceMemoryUsage]: JSON.stringify(humanMemoryUsage(), null, 2),
        exData: JSON.stringify(exData, null, 2),
        exError: JSON.stringify(exError, null, 2),
      })

      const attrs: Attributes = {
        [AttrNames.LogLevel]: 'error',
      }

      return { attrs, events }
    },
    after([options], _result, decoratorContext) {
      if (! eventNeedTrace(KmoreAttrNames.QueryError, options.dbConfig)) { return }

      const { traceService, traceScope, traceSpan } = decoratorContext
      assert(traceService, 'traceService is empty')
      assert(traceScope, 'onResp.after() traceScope is empty')
      assert(traceSpan, 'traceSpan is empty')

      const scopeRootSpan = traceService.getActiveSpanOnlyScope(traceScope)
      if (scopeRootSpan && scopeRootSpan === traceSpan) {
        const spanStatusOptions = { code: SpanStatusCode.ERROR }
        return { endSpanAfterTraceLog: true, spanStatusOptions }
      }

      return null
    },
  })
  async onError(this: DbEvent, options: OnEventOptions): Promise<void> {
    const { dbConfig, event, kmore } = options
    assert(dbConfig)
    assert(event.type === 'queryError', event.type)

    const cb = dbConfig.eventCallbacks?.queryError
    return cb?.(event, kmore)
  }


  protected getTrxTraceScopeByQueryId(db: Kmore, queryId: symbol): TraceScopeType | undefined {
    const trx = db.getTrxByQueryId(queryId)
    return trx?.kmoreTrxId
  }

  protected retrieveTraceScope(kmore: Kmore, kmoreQueryId: symbol, builder: KmoreQueryBuilder): TraceScopeType {
    const { pagingGroupKey, pagingType } = builder

    const traceScope = this.getTrxTraceScopeByQueryId(kmore, kmoreQueryId)
    if (pagingType) { // paging
      if (pagingType === 'counter') { // counter
        if (traceScope) {
          return traceScope
        }
      }
      // pager
      return pagingGroupKey ?? kmoreQueryId
    }
    return traceScope ?? kmoreQueryId
  }

}

// #region types


interface OnEventOptions {
  dataSourceName: string
  dbConfig: DbConfig
  event: KmoreEvent
  kmore: Kmore
}

