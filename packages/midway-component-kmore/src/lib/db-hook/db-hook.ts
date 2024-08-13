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
import { genError } from '@waiting/shared-core'
import type { Kmore, ExceptionHookOptions, KmoreTransaction } from 'kmore'

import { genCallerKey } from '../propagation/trx-status.helper.js'
import { TrxStatusService } from '../trx-status.service.js'
import { ConfigKey, KmoreSourceConfig, DbConfig } from '../types.js'

import { DbHookBuilder } from './db-hook.builder.js'
import { DbHookTrx } from './db-hook.trx.js'


@Singleton()
export class DbHook<SourceName extends string = string> {

  @MConfig(ConfigKey.config) private readonly sourceConfig: KmoreSourceConfig<SourceName>

  @App() readonly app: Application
  @ApplicationContext() readonly applicationContext: IMidwayContainer

  @Inject() readonly appDir: string
  @Inject() readonly baseDir: string

  @Inject() readonly trxStatusSvc: TrxStatusService
  @Inject() readonly traceService: TraceService

  @Inject() readonly dbHookBuilder: DbHookBuilder
  @Inject() readonly dbHookTrx: DbHookTrx


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


  // #region proxy

  createProxy(db: Kmore): void {
    // dbId is dbSourceName
    this.trxStatusSvc.registerDbInstance(db.dbId, db)

    db.hookList.builderPreHooks.unshift(this.dbHookBuilder.builderPreHooks.bind(this.dbHookBuilder))
    db.hookList.builderPostHooks.unshift(this.dbHookBuilder.builderPostHook.bind(this.dbHookBuilder))

    db.hookList.builderTransactingPostHooks.unshift(this.dbHookBuilder.builderTransactingPostHook.bind(this.dbHookBuilder))

    db.hookList.responsePreHooks.unshift(this.dbHookBuilder.builderResultPreHook.bind(this.dbHookBuilder))
    db.hookList.exceptionHooks.unshift(this.exceptionHook.bind(this))

    db.hookList.transactionPreHooks.unshift(this.dbHookTrx.transactionPreHook.bind(this.dbHookTrx))
    db.hookList.transactionPostHooks.unshift(this.dbHookTrx.transactionPostHook.bind(this.dbHookTrx))

    db.hookList.beforeCommitHooks.push(this.dbHookTrx.beforeCommitHook.bind(this.dbHookTrx))
    db.hookList.afterCommitHooks.unshift(this.dbHookTrx.afterCommitHook.bind(this.dbHookTrx))

    db.hookList.beforeRollbackHooks.push(this.dbHookTrx.beforeRollbackHook.bind(this.dbHookTrx))
    db.hookList.afterRollbackHooks.unshift(this.dbHookTrx.afterRollbackHook.bind(this.dbHookTrx))
  }

  // #region exception hooks

  async exceptionHook(options: ExceptionHookOptions): Promise<never> {
    if (options.trxPropagated && options.trxPropagateOptions) {
      const { kmore, builder, rowLockLevel } = options

      // if (! builder.scope) {
      //   builder.scope = this.getWebContext() ?? this.app
      // }

      if (rowLockLevel) {
        // @FIXME
        // this.trxStatusSvc.updateBuilderSpanRowlockLevelTag(kmoreQueryId, rowLockLevel)
        void builder
      }

      const { className, funcName } = options.trxPropagateOptions
      const callerKey = genCallerKey(className, funcName)
      assert(callerKey, 'callerKey is empty')
      const scope = this.getWebContextThenApp()
      await this.trxStatusSvc.trxRollbackEntry(kmore.dbId, scope, callerKey)
    }

    const err = genError({ error: options.exception, altMessage: '[kmore-component] DbManager#exceptionHook' })
    throw err
  }

}

