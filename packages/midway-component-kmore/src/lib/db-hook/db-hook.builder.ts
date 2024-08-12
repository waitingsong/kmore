/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import {
  App,
  ApplicationContext,
  IMidwayContainer,
  Inject,
  Singleton,
} from '@midwayjs/core'
import { TraceScopeType, TraceService } from '@mwcp/otel'
import { Application, Context, MConfig, getWebContext } from '@mwcp/share'
import type {
  BuilderHookOptions,
  ResponseHookOptions,
  KmoreTransaction,
} from 'kmore'

import { TrxStatusService } from '../trx-status.service.js'
import { ConfigKey, KmoreSourceConfig, DbConfig } from '../types.js'


@Singleton()
export class DbHookBuilder<SourceName extends string = string> {

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

  getTraceScopeByTrx(transaction: KmoreTransaction): TraceScopeType {
    return transaction.kmoreTrxId
  }


  // #region builder hooks

  builderPreHooks(options: BuilderHookOptions): BuilderHookOptions {
    const ret = this.builderPrePropagating(options)
    return ret
  }

  builderPostHook(options: BuilderHookOptions): Promise<BuilderHookOptions > {
    const ret = this.builderPostPropagating(options)
    return ret
  }

  protected builderPrePropagating(options: BuilderHookOptions): BuilderHookOptions {
    const { kmore, builder } = options

    if (! builder.scope) {
      builder.scope = this.getWebContext()
    }
    if (! builder.scope) {
      builder.scope = this.app
    }

    if (builder.trxPropagated) {
      return options
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
    return options
  }

  protected async builderPostPropagating(options: BuilderHookOptions): Promise<BuilderHookOptions> {
    const { builder } = options

    if (! builder.scope) {
      builder.scope = this.getWebContext()
    }

    if (builder.trxPropagated) {
      return options
    }

    await this.trxStatusSvc.propagating({
      builder,
      db: options.kmore,
    })

    return options
  }

  async builderResultPreHook(options: ResponseHookOptions): Promise<ResponseHookOptions> {
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

    return options
  }

}

