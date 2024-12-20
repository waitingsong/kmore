import assert from 'node:assert'

import {
  App,
  ApplicationContext,
  IMidwayContainer,
  Inject,
  Singleton,
} from '@midwayjs/core'
import {
  type Span,
  type TraceService,
  AttrNames,
  Attributes,
  DecoratorTraceData,
  SpanStatusCode,
  StartScopeActiveSpanOptions,
  Trace,
  TraceLog,
  TraceScopeType,
  getSpan,
} from '@mwcp/otel'
import { Application, Context, MConfig, getWebContext } from '@mwcp/share'
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
  @Inject() readonly traceService: TraceService

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
    before([options], decoratorContext) {
      if (! eventNeedTrace(KmoreAttrNames.BuilderCompile, options.dbConfig)) { return }
      const traceContext = decoratorContext.traceContext ?? this.traceService.getActiveContext()
      const { kmore, event } = options
      const { kmoreQueryId, queryBuilder } = event

      const traceScope = this.retrieveTraceScope(kmore, kmoreQueryId, queryBuilder)
      if (! this.trxStatusSvc.getTraceContextByScope(traceScope)) {
        this.trxStatusSvc.setTraceContextByScope(traceScope, traceContext)
      }
      this.trxStatusSvc.setTraceContextByScope(kmoreQueryId, traceContext)

      const { pagingType } = queryBuilder
      const traceSpan = getSpan(traceContext)
      const ret: DecoratorTraceData = {}

      if (pagingType && traceSpan) {
        if (pagingType === 'counter') {
          assert(queryBuilder.pagingGroupKey, 'queryBuilder.pagingGroupKey is empty')
          if (! this.trxStatusSvc.getTraceContextByScope(queryBuilder.pagingGroupKey)) {
            this.trxStatusSvc.setTraceContextByScope(queryBuilder.pagingGroupKey, traceContext)
          }

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
          const { traceContext: traceCtx2 } = this.traceService.startScopeSpan(opts)
          this.trxStatusSvc.setTraceContextByScope(kmoreQueryId, traceCtx2)
          ret.traceContext = traceCtx2 // necessary
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
    before([options]) {
      if (! eventNeedTrace(KmoreAttrNames.QueryResponse, options.dbConfig)) { return }
      const { respRaw } = options.event

      const attrs: Attributes = {}
      if (respRaw?.response?.command) {
        attrs['db.operation'] = respRaw.response.command
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
    after([options]) {
      if (! eventNeedTrace(KmoreAttrNames.QueryResponse, options.dbConfig)) { return }

      const ret: DecoratorTraceData = {}
      const { pagingType } = options.event.queryBuilder

      const { kmore, event } = options
      const { kmoreQueryId } = event
      const traceScope = this.retrieveTraceScope(kmore, kmoreQueryId, event.queryBuilder)

      switch (pagingType) {
        case 'counter': {
          this.trxStatusSvc.removeTraceContextByScope(kmoreQueryId)
          ret.endSpanAfterTraceLog = true
          break
        }

        case 'pager': {
          const spans: Span[] = []
          const scopeCtx = this.trxStatusSvc.getTraceContextByScope(traceScope)
          if (scopeCtx) {
            const span = getSpan(scopeCtx)
            if (span?.isRecording()) {
              spans.push(span)
            }
          }
          const activeCtx = this.trxStatusSvc.getTraceContextByScope(event.kmoreQueryId)
          if (activeCtx) {
            const span = getSpan(activeCtx)
            if (span?.isRecording()) {
              spans.push(span)
            }
          }

          this.trxStatusSvc.removeTraceContextByScope(kmoreQueryId)
          const { pagingGroupKey } = event.queryBuilder
          if (pagingGroupKey) {
            this.trxStatusSvc.removeTraceContextByScope(pagingGroupKey)
          }
          this.trxStatusSvc.removeTraceContextByScope(traceScope)
          ret.endSpanAfterTraceLog = spans
          break
        }

        default: {
          ret.endSpanAfterTraceLog = true
        }
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
    before([options], decoratorContext) {
      if (! eventNeedTrace(KmoreAttrNames.QueryQuerying, options.dbConfig)) { return }
      const { traceService, traceSpan } = decoratorContext
      assert(traceService, 'traceService is empty')
      assert(traceSpan, 'traceSpan is empty')

      const { config: knexConfig } = options.dbConfig
      const conn = knexConfig.connection as ConnectionConfig
      const { dbId, kUid, queryUid, trxId, data } = options.event

      const attrs: Attributes = {
        dbId,
        ['db.system']: typeof knexConfig.client === 'string'
          ? knexConfig.client
          : JSON.stringify(knexConfig.client, null, 2),
        ['net.peer.name']: conn.host,
        ['db.name']: conn.database,
        ['net.peer.port']: conn.port ?? '',
        ['db.user']: conn.user,
        // [AttrNames.QueryCostThrottleInMS]: sampleThrottleMs,
        kUid,
        queryUid,
        trxId: trxId ?? '',
        ['db.statement']: data?.sql ?? '',
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
    before([options]) {
      if (! eventNeedTrace(KmoreAttrNames.QueryError, options.dbConfig)) { return }
      // if (! decoratorContext.traceScope) {
      //   const { kmore } = options
      //   const { kmoreQueryId, queryBuilder } = options.event
      //   decoratorContext.traceScope = this.retrieveTraceScope(kmore, kmoreQueryId, queryBuilder)
      // }

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
      // assert(traceScope, 'onResp.after() traceScope is empty')
      assert(traceSpan, 'traceSpan is empty')

      if (traceScope) {
        const scopeRootSpan = traceService.getRootSpan(traceScope)
        if (scopeRootSpan && scopeRootSpan === traceSpan) {
          const spanStatusOptions = { code: SpanStatusCode.ERROR }
          return { endSpanAfterTraceLog: true, spanStatusOptions }
        }
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


  retrieveTraceScope(kmore: Kmore, kmoreQueryId: symbol, builder: KmoreQueryBuilder): TraceScopeType {
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

  protected getTrxTraceScopeByQueryId(db: Kmore, queryId: symbol): TraceScopeType | undefined {
    const trx = db.getTrxByQueryId(queryId)
    return trx?.kmoreTrxId
  }

}

// #region types


interface OnEventOptions {
  dataSourceName: string
  dbConfig: DbConfig
  event: KmoreEvent
  kmore: Kmore
}

