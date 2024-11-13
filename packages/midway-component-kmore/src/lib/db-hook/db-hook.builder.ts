
import assert from 'node:assert'

import {
  App,
  ApplicationContext,
  IMidwayContainer,
  Inject,
  Singleton,
} from '@midwayjs/core'
import { TraceLog, TraceScopeType, TraceService } from '@mwcp/otel'
import { Application, Context, MConfig, getWebContext } from '@mwcp/share'
import type {
  BuilderHookOptions,
  BuilderTransactingHookOptions,
  Kmore,
  KmoreTransaction,
  ResponseHookOptions,
} from 'kmore'

import { eventNeedTrace, genCommonAttr } from '../trace.helper.js'
import { TrxStatusService } from '../trx-status.service.js'
import { ConfigKey, DbConfig, KmoreAttrNames, KmoreSourceConfig } from '../types.js'


@Singleton()
export class DbHookBuilder<SourceName extends string = string> {

  @MConfig(ConfigKey.config) private readonly sourceConfig: KmoreSourceConfig<SourceName>

  @App() readonly app: Application
  @ApplicationContext() readonly applicationContext: IMidwayContainer

  @Inject() readonly appDir: string
  @Inject() readonly baseDir: string

  @Inject() readonly trxStatusSvc: TrxStatusService
  @Inject() readonly traceService: TraceService


  // #region builderPreHooks

  builderPreHooks(options: BuilderHookOptions): void {
    this.builderPrePropagating(options)
  }

  // #region builderPostHooks

  async builderPostHook(options: BuilderHookOptions): Promise<void> {
    await this.builderPostPropagating(options)
  }

  protected builderPrePropagating(options: BuilderHookOptions): void {
    const { kmore, builder } = options

    if (! builder.scope) {
      builder.scope = this.getWebContext()
    }
    if (! builder.scope) {
      builder.scope = this.app
    }

    if (builder.trxPropagated) {
      return
    }

    /* Call stack in bindBuilderPropagationData():
      1 - TrxStatusService.bindBuilderPropagationData(trx - status.service.ts: 389)
      2 - DbSourceManager.builderPrePropagating(db - source - manager.ts: 377)
      3 - DbSourceManager.builderPreProcessor(db - source - manager.ts: 378)
      4 - <anonymous>(builder.index.js: 67)
      5 - extRefTableFnProperty(builder.index.js: 64)
      6 - tb_user(builder.index.js: 28)
      7 - UserRepo6.getUsers(70c.cache.repo.ts: 78) <-- call from here 6+1
      8 - Clz.<computed>(aspectService.js: 92)
    */
    /*
      1 - TrxStatusService.bindBuilderPropagationData (trx-status.service.ts:318)
      2 - DbSourceManager.builderPrePropagating (db-source-manager.ts:404)
      3 - DbSourceManager.builderPreProcessor (db-source-manager.ts:377)
      4 - <anonymous> (builder.index.js:62)
      5 - createQueryBuilder (builder.index.js:59)
      6 - tb_user (builder.index.js:27)
      7 - TrxRepo._update (101/101r.middle-trx-auto-action.repo.ts:46)  <-- call from here 6+1
      8 - TrxRepo.commit (101/101r.middle-trx-auto-action.repo.ts:33)
    */
    this.trxStatusSvc.bindBuilderPropagationData(kmore.dbId, builder, 6)
  }

  protected async builderPostPropagating(options: BuilderHookOptions): Promise<void> {
    const { builder } = options

    if (! builder.scope) {
      builder.scope = this.getWebContext()
    }

    if (builder.trxPropagated) {
      return
    }

    await this.trxStatusSvc.propagating({
      builder,
      db: options.kmore,
    })
  }

  // #region builderResultPreHook

  async builderResultPreHook(options: ResponseHookOptions): Promise<void> {
    if (options.kmoreTrxId && options.trxPropagated && options.trxPropagateOptions) {
      const { builder, rowLockLevel } = options
      if (rowLockLevel) {
        // @FIXME
        // this.trxStatusSvc.updateBuilderSpanRowlockLevelTag(kmoreQueryId, rowLockLevel)
        void builder
      }

      // const { className, funcName } = options.trxPropagateOptions
      // const callerKey = genCallerKey(className, funcName)
      // assert(callerKey, 'callerKey is empty')

      // const tkey = this.trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
    }
  }

  // #region builderTransactingPostHook

  @TraceLog<DbHookBuilder['builderTransactingPostHook']>({
    // scope([options]) {
    //   const { kmore, builder } = options
    //   const traceScope = this.getTrxTraceScopeByQueryId(kmore, builder.kmoreQueryId)
    //   if (traceScope) {
    //     return traceScope
    //   }
    //   const traceScope2 = builder.kmoreQueryId
    //   return traceScope2
    // },
    after([options], _res, decoratorContext) { // options.dbConfig not exists at before()
      const dbConfig = this.getDbConfigByDbId(options.kmore.dbId)
      if (dbConfig && ! eventNeedTrace(KmoreAttrNames.BuilderTransacting, dbConfig)) { return }

      const { kmore, builder } = options
      if (! decoratorContext.traceScope) {
        const traceScope = this.getTrxTraceScopeByQueryId(kmore, builder.kmoreQueryId)
        if (traceScope) {
          decoratorContext.traceScope = traceScope
        }
        else {
          decoratorContext.traceScope = builder.kmoreQueryId
        }
      }

      // @ts-expect-error builder._method
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      let method: string = builder._method ?? 'unknown'
      if (method === 'del') {
        method = 'delete'
      }

      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const table: string = builder._single?.table ?? '',

      const events = genCommonAttr(KmoreAttrNames.BuilderTransacting, {
        kmoreQueryId: builder.kmoreQueryId.toString(),
        method,
        table,
      })
      return { events }
    },
  })
  builderTransactingPostHook(this: DbHookBuilder, options: BuilderTransactingHookOptions): void {
    void options
  }


  protected getTrxTraceScopeByQueryId(db: Kmore, queryId: symbol): TraceScopeType | undefined {
    const trx = db.getTrxByQueryId(queryId)
    return trx?.kmoreTrxId
  }

  protected getDbConfigByDbId(dbId: SourceName): DbConfig | undefined {
    assert(dbId)
    const dbConfig = this.sourceConfig.dataSource[dbId]
    return dbConfig
  }

  protected getWebContext(): Context | undefined {
    return getWebContext(this.applicationContext)
  }

  protected getWebContextThenApp(): Context | Application {
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

  protected getTraceScopeByTrx(transaction: KmoreTransaction): TraceScopeType {
    return transaction.kmoreTrxId
  }

}

