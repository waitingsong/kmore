
import assert from 'node:assert'
import { relative } from 'node:path'

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
  Trace,
  TraceLog,
  TraceScopeType,
} from '@mwcp/otel'
import { Application, Context, MConfig, getWebContext } from '@mwcp/share'
import {
  type KmoreTransaction,
  type TransactionHookOptions,
  type TransactionPreHookOptions,
  genKmoreTrxId,
} from 'kmore'

import { genCommonAttr } from '../trace.helper.js'
import { TrxStatusService } from '../trx-status.service.js'
import { ConfigKey, DbConfig, KmoreAttrNames, KmoreSourceConfig } from '../types.js'

import { type ProcessTrxCommitAndRollbackData, processTrxCommitAndRollback } from './db-hook.trx.helper.js'


@Singleton()
export class DbHookTrx<SourceName extends string = string> {

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

  getTraceScopeByTrx(transaction: KmoreTransaction): TraceScopeType {
    return transaction.kmoreTrxId
  }


  // #region transactionPreHook

  @Trace<DbHookTrx['transactionPreHook']>({
    autoEndSpan: false, // end span in DbHook.afterCommitHook/afterRollbackHook
    spanName: ([options]) => {
      const dbSourceName = options.kmore.dbId
      return `Kmore ${dbSourceName} transaction`
    },
    scope: ([options]: [TransactionPreHookOptions]) => {
      const { kmore, config } = options
      if (config.kmoreTrxId) {
        return config.kmoreTrxId
      }
      const entryKey = config.trxPropagateOptions?.entryKey ?? ''
      const kmoreTrxId = genKmoreTrxId(`trx-${kmore.dbId}-`, entryKey)
      config.kmoreTrxId = kmoreTrxId
      return kmoreTrxId
    },
    after([options]: [TransactionPreHookOptions]) {
      const { kmore, config } = options
      const { kmoreTrxId } = config
      assert(kmoreTrxId, 'transactionPreHook() kmoreTrxId is empty')

      if (! config.scope) {
        config.scope = this.getWebContext() ?? this.app
      }

      const events = genCommonAttr(KmoreAttrNames.TrxCreateStart)
      const attrs: Attributes = {
        dbId: kmore.dbId,
        kmoreTrxId: kmoreTrxId.toString(),
      }

      return { attrs, events }
    },
  })
  async transactionPreHook(this: DbHookTrx, options: TransactionPreHookOptions): Promise<void> {
    void options
  }

  // #region transactionPostHook

  @TraceLog<DbHookTrx['transactionPostHook']>({
    scope: ([options]: [TransactionPreHookOptions]) => {
      const { kmoreTrxId } = options.config
      assert(kmoreTrxId, 'transactionPostHook() kmoreTrxId is empty')
      return kmoreTrxId
    },
    before([options]) {
      const { kmore, config, trx } = options
      const { kmoreTrxId } = config
      assert(kmoreTrxId, 'transactionPostHook() kmoreTrxId is empty')

      let attrs: Attributes = {
        dbId: kmore.dbId,
        kmoreTrxId: kmoreTrxId.toString(),
      }
      const { trxPropagateOptions } = trx
      if (trxPropagateOptions) {
        const path = trxPropagateOptions.path
          ? relative(this.appDir, trxPropagateOptions.path.replace(/^file:\/{3}/u, '')).replaceAll('\\', '/')
          : ''
        const attrs2 = {
          [AttrNames.TrxPropagationType]: trxPropagateOptions.type,
          [AttrNames.TrxPropagationClass]: trxPropagateOptions.className,
          [AttrNames.TrxPropagationFunc]: trxPropagateOptions.funcName,
          [AttrNames.TrxPropagationPath]: path,
          [AttrNames.TrxPropagationReadRowLockLevel]: trxPropagateOptions.readRowLockLevel,
          [AttrNames.TrxPropagationWriteRowLockLevel]: trxPropagateOptions.writeRowLockLevel,
        }
        attrs = Object.assign(attrs, attrs2)
      }

      const events = genCommonAttr(KmoreAttrNames.TrxCreateEnd)
      return { attrs, events }
    },
  })
  async transactionPostHook(this: DbHookTrx, options: TransactionHookOptions): Promise<void> {
    const { trx } = options
    assert(trx.scope, 'transactionPostHook() trx.scope is empty')
  }

  // #region beforeCommit

  @TraceLog<DbHookTrx['beforeCommitHook']>({
    scope([options]) {
      return this.getTraceScopeByTrx(options.trx)
    },
    after([options]) {
      const { kmore, trx } = options
      const events = genCommonAttr(KmoreAttrNames.TrxCommitStart, {
        dbId: kmore.dbId,
        kmoreTrxId: trx.kmoreTrxId.toString(),
      })
      return { events }
    },
  })
  async beforeCommitHook(this: DbHookTrx<SourceName>, options: TransactionHookOptions): Promise<void> {
    void options
  }

  // #region afterCommit

  @TraceLog<DbHookTrx['afterCommitHook']>({
    scope([options]) {
      return this.getTraceScopeByTrx(options.trx)
    },
    before([options], decoratorContext) {
      const data: ProcessTrxCommitAndRollbackData = {
        eventName: KmoreAttrNames.TrxCommitEnd,
        hook: 'afterCommitHook',
        stage: 'before',
        op: 'commit',
      }
      return processTrxCommitAndRollback(options, decoratorContext, data)
    },
  })
  async afterCommitHook(this: DbHookTrx<SourceName>, options: TransactionHookOptions): Promise<void> {
    void options
  }

  // #region beforeRollback

  @TraceLog<DbHookTrx['beforeRollbackHook']>({
    scope([options]) {
      return this.getTraceScopeByTrx(options.trx)
    },
    after: ([options]) => {
      const { kmore, trx } = options
      const events = genCommonAttr(KmoreAttrNames.TrxRollbackStart, {
        dbId: kmore.dbId,
        kmoreTrxId: trx.kmoreTrxId.toString(),
      })
      return { events }
    },
  })
  async beforeRollbackHook(this: DbHookTrx<SourceName>, options: TransactionHookOptions): Promise<void> {
    void options
  }

  // #region afterRollback

  @TraceLog<DbHookTrx['afterRollbackHook']>({
    scope([options]) {
      return this.getTraceScopeByTrx(options.trx)
    },
    before([options], decoratorContext) {
      const data: ProcessTrxCommitAndRollbackData = {
        eventName: KmoreAttrNames.TrxRollbackEnd,
        hook: 'afterRollbackHook',
        stage: 'before',
        op: 'rollback',
      }
      return processTrxCommitAndRollback(options, decoratorContext, data)
    },
  })
  async afterRollbackHook(this: DbHookTrx<SourceName>, options: TransactionHookOptions): Promise<void> {
    void options
  }
}

