import assert from 'node:assert'

import { ApplicationContext, IMidwayContainer, Inject, Singleton } from '@midwayjs/core'
import { type TraceContext, AttrNames, Attributes, TraceService } from '@mwcp/otel'
import type { ScopeType } from '@mwcp/share'
import { CallerInfo, genISO8601String } from '@waiting/shared-core'
import {
  Kmore,
  KmoreQueryBuilder,
  KmoreTransaction,
  KmoreTransactionConfig,
  PropagationType,
  QueryBuilderExtKey,
  TrxControl,
  // RowLockLevel,
  TrxPropagateOptions,
  genKmoreTrxId,
} from 'kmore'

import { CallerService } from './caller.service.js'
import { genCallerKey, linkBuilderWithTrx } from './propagation/trx-status.helper.js'
import {
  CallerKey,
  CallerKeyPropagationMapIndex,
  DbSourceName,
  EntryCallerKeyTrxMapIndex,
  PropagatingOptions,
  PropagatingRet,
  RegisterTrxPropagateOptions,
  StartNewTrxOptions,
  // TraceEndOptions,
  TransactionalEntryType,
} from './propagation/trx-status.types.js'
import { ConfigKey, Msg } from './types.js'


/**
 * Declarative transaction status manager
 */
@Singleton()
export class TrxStatusService {

  @ApplicationContext() readonly applicationContext: IMidwayContainer
  @Inject() readonly appDir: string
  // @Inject() readonly logger: TraceLogger
  @Inject() protected readonly traceSvc: TraceService
  @Inject() protected readonly callerSvc: CallerService

  readonly scope2TraceContextMap = new WeakMap<ScopeType, TraceContext>()

  protected readonly dbInstanceList = new Map<string, Kmore>()
  protected readonly callerKeyPropagationMapIndex: CallerKeyPropagationMapIndex = new Map()
  protected readonly entryCallerKeyTrxMapIndex: EntryCallerKeyTrxMapIndex = new Map()

  getName(): string { return 'trxStatusService' }

  // #region dbInstance

  registerDbInstance(dbId: string, db: Kmore): void {
    this.dbInstanceList.set(dbId, db)
  }

  /**
   * If dbId is undefined or empty
   * - return the only on instance
   * - throw error if multiple instance exists
   */
  getDbInstance(dbId: string | undefined): Kmore | undefined {
    if (dbId) {
      return this.dbInstanceList.get(dbId)
    }
    if (this.dbInstanceList.size === 1) {
      const iterator = this.dbInstanceList.values()
      const firstValue = iterator.next().value
      return firstValue
    }
    throw new Error('getDbInstance(): dbId is undefined, but multiple instances exists')
  }

  getDbInstanceCount(): number {
    return this.dbInstanceList.size
  }

  listDbInstanceNames(): DbSourceName[] {
    return Array.from(this.dbInstanceList.keys())
  }

  unregisterDbInstance(dbId: string): void {
    this.dbInstanceList.delete(dbId)
  }

  // #region registerPropagation()

  registerPropagation(options: RegisterTrxPropagateOptions): CallerKey {
    const event: Attributes = {
      event: AttrNames.TransactionalRegister,
      time: genISO8601String(),
      [AttrNames.TrxPropagationReadRowLockLevel]: options.readRowLockLevel,
      [AttrNames.TrxPropagationWriteRowLockLevel]: options.writeRowLockLevel,
    }

    const { scope } = options
    assert(scope, 'scope required')

    const dbInstance = this.getDbInstance(options.dbSourceName)
    assert(dbInstance, `dbSourceName "${options.dbSourceName}" not found`)
    const dbSourceName = dbInstance.dbId
    options.dbSourceName = dbSourceName

    const key = genCallerKey(options.className, options.funcName)
    const tkey = this.retrieveRegisteredTopCallerKeyFromCallStack(dbSourceName, scope)
    const type = this.getPropagationType(dbSourceName, scope, key)
    if (type) {
      assert(
        type === options.type,
        `callerKey "${key}" has registered propagation "${type}", but want to register different "${options.type}"`,
      )
      if (tkey) { // has ancestor caller that registered
        this.callerSvc.updateCallerTreeMap(dbSourceName, scope, tkey, key)
      }
      else { // getCallerStack will return insufficient sites if calling self without "await", so not top level caller
        const prefix = `[@mwcp/${ConfigKey.namespace}] registerPropagation() error: `
        const msg = prefix + `${Msg.insufficientCallstacks}. Maybe calling async function without "await",
        Result of Query Builder MUST be "await"ed within Transactional decorator method.
        callerKey: "${key}\n"
        `
        console.error(msg)
        const err = new Error(msg)
        this.traceSvc.setRootSpanWithError(err)
        throw err
      }
      event[AttrNames.TransactionalEntryType] = TransactionalEntryType.sub
    }
    else {
      this.setPropagationOptions(key, options)
      if (tkey) { // has ancestor caller that registered
        this.callerSvc.updateCallerTreeMap(dbSourceName, scope, tkey, key)
        event[AttrNames.TransactionalEntryType] = TransactionalEntryType.sub
      }
      else { // top level caller
        this.callerSvc.updateCallerTreeMap(dbSourceName, scope, key, void 0)
        event[AttrNames.TransactionalEntryType] = TransactionalEntryType.top
      }
    }

    return key
  }

  retrieveUniqueTopCallerKey(sourceName: DbSourceName | undefined, scope: ScopeType, key: CallerKey): CallerKey | undefined {
    const dbInstance = this.getDbInstance(sourceName)
    assert(dbInstance, `dbSourceName "${sourceName}" not found`)
    const dbSourceName = dbInstance.dbId
    assert(dbSourceName, 'dbSourceName is undefined')

    return this.callerSvc.retrieveUniqueTopCallerKey(dbSourceName, scope, key)
  }

  /**
   * Is decorator `Transactional()` registered with current scope and callerKey
   */
  isRegistered(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): boolean {
    const sourceNameMap = this.callerKeyPropagationMapIndex.get(scope)
    if (! sourceNameMap?.size) { return false }

    const callerKeyPropagationMap = sourceNameMap.get(dbSourceName)
    if (! callerKeyPropagationMap?.size) { return false }

    return callerKeyPropagationMap.has(key)
  }

  // retrieveUpLatestCallerKey(options: DecoratorExecutorOptions): CallerKey | undefined {
  //   const key = genCallerKey(options.className, options.funcName)
  // }

  // #region startNewTrx()

  async startNewTrx(this: TrxStatusService, options: StartNewTrxOptions): Promise<KmoreTransaction> {
    const { db, scope, kmoreTrxId: trxId, trxPropagateOptions } = options
    const callerKey = trxPropagateOptions.key
    const kmoreTrxId = trxId ?? genKmoreTrxId('trx-', callerKey)
    assert(kmoreTrxId, `kmoreTrxId is undefined for callerKey "${callerKey}"`)

    const dbSourceName = db.dbId
    assert(dbSourceName, 'dbSourceName is undefined on db')

    const config: KmoreTransactionConfig = {
      trxActionOnError: TrxControl.Rollback,
      ...options,
      kmoreTrxId,
    }

    const trx: KmoreTransaction = await db.transaction(config)
    assert(
      trx.kmoreTrxId === kmoreTrxId,
      `trx.kmoreTrxId "${trx.kmoreTrxId.toString()}" not equal to kmoreTrxId "${kmoreTrxId.toString()}"`,
    )

    if (! trx.trxPropagateOptions) {
      Object.defineProperty(trx, QueryBuilderExtKey.trxPropagateOptions, {
        value: trxPropagateOptions,
      })
    }

    const { entryKey } = options.trxPropagateOptions
    try {
      this.updateEntryCallerKeyTrxMap(dbSourceName, scope, entryKey, trx)
    }
    catch (ex) {
      await trx.rollback()
      throw ex
    }
    return trx
  }


  // #region Trx Commit

  /**
   * Only top caller can commit
   */
  async tryCommitTrxIfKeyIsEntryTop(sourceName: DbSourceName | undefined, scope: ScopeType, callerKey: CallerKey): Promise<void> {
    const dbInstance = this.getDbInstance(sourceName)
    assert(dbInstance, `dbSourceName "${sourceName}" not found`)
    const dbSourceName = dbInstance.dbId

    assert(callerKey, 'tryCommitTrxIfKeyIsEntryTop(): callerKey is undefined')
    const tkey = this.retrieveUniqueTopCallerKey(dbSourceName, scope, callerKey)
    if (! tkey) { // multiple callings
      this.callerSvc.removeLastKeyFromCallerTreeArray(dbSourceName, scope, callerKey)
      return
    }
    if (tkey !== callerKey) { return }

    // if (! tkey) {
    //   const tkeyArr = this.retrieveTopCallerKeyArrayByCallerKey(scope, callerKey)

    //   if (! tkeyArr.length) {
    //     const msg = `${Msg.callerKeyNotRegisteredOrNotEntry}: "${callerKey}".
    //     Maybe calling async function without "await", or has been removed with former error.\n`
    //     // @FIXME
    //     // this.logger.error(msg)
    //     throw new Error(msg)
    //     // return
    //   }
    //   else if (tkeyArr.length > 1) { // multiple callings
    //     this.removeLastKeyFromCallerTreeArray(scope, callerKey)
    //     return
    //   }
    //   tkey = tkeyArr[0]
    //   assert(tkey, 'tkey is undefined')
    //   if (tkey !== callerKey) { return }
    // }
    // if (callerKey !== tkey) {
    //   this.removeLastKeyFromCallerTreeArray(scope, callerKey)
    //   return
    // }

    const trxs = this.getTrxArrayByEntryKey(dbSourceName, scope, tkey)
    if (! trxs?.length) {
      this.cleanAfterTrx(void 0, scope, tkey)
      return
    }

    // Delay for commit, prevent from method returning Promise or calling Knex builder without `await`!
    // await sleep(0)
    for (let i = trxs.length - 1; i >= 0; i -= 1) {
      const trx = trxs[i]
      assert(trx, 'trx is undefined when tryCommitTrxIfKeyIsEntryTop()')

      assert(trx.dbId === dbSourceName, `trx.dbId "${trx.dbId}" not equal to dbSourceName2 "${dbSourceName}"`)


      await trx.commit()
      this.removeTrxFromEntryCallerKeyTrxMap(dbSourceName, scope, trx.kmoreTrxId)
      this.cleanAfterTrx(dbSourceName, scope, tkey)

    }
  }

  // #region Trx Rollback

  async trxRollbackEntry(sourceName: DbSourceName | undefined, scope: ScopeType, callerKey: CallerKey): Promise<void> {
    const dbInstance = this.getDbInstance(sourceName)
    assert(dbInstance, `dbSourceName "${sourceName}" not found`)
    const dbSourceName = dbInstance.dbId
    assert(dbSourceName, 'dbSourceName is undefined')

    const tkeyArr = this.callerSvc.retrieveTopCallerKeyArrayByCallerKey(dbSourceName, scope, callerKey)
    let tkey = callerKey
    if (tkeyArr.length > 0) {
      const key = tkeyArr.at(-1) // pick last one
      if (key) {
        tkey = key
      }
    }

    const trxs = this.getTrxArrayByEntryKey(dbSourceName, scope, tkey)
    if (! trxs?.length) {
      this.cleanAfterTrx(void 0, scope, tkey)
      return
    }

    for (const trx of trxs) {
      try {

        await trx.rollback()
      }
      catch (ex) {
        const msg = `ROLLBACK failed for key: "${tkey}". This error will be ignored, continue next trx rollback.`
        console.warn(msg, ex)
        // @FIXME
        // this.logger.error(msg, ex)
      }
      this.cleanAfterTrx(dbSourceName, scope, tkey)
    }
  }


  // #region Propagation

  bindBuilderPropagationData(
    dbSourceName: DbSourceName,
    builder: KmoreQueryBuilder,
    distance = 0,
  ): void {

    if (builder.trxPropagated) {
      return
    }

    const { scope } = builder
    assert(scope, 'scope is undefined')

    const count = this.getPropagationOptionsCount(dbSourceName, scope)
    if (! count) {
      return
    }

    let callerInfo: CallerInfo | undefined
    try {
      callerInfo = this.callerSvc.retrieveCallerInfo(distance + 1)
      if (! callerInfo.className || ! callerInfo.funcName) {
        return
      }
    }
    catch (ex) {
      console.warn('[@mwcp/kmore] retrieveCallerInfo failed', ex)
      return
    }

    const key = genCallerKey(callerInfo.className, callerInfo.funcName)
    builder.callerKey = key

    const isRegistered = this.isRegistered(dbSourceName, scope, key)
    if (! isRegistered) { return }
    const propagatingOptions = this.getPropagationOptions(dbSourceName, scope, key)
    if (! propagatingOptions?.type) { return }
    const { readRowLockLevel, writeRowLockLevel } = propagatingOptions

    this.callerSvc.validateCallerKeyUnique(dbSourceName, scope, key, callerInfo.path)
    this.callerSvc.setFilepathToCallerKeyFileMapIndex(dbSourceName, scope, key, callerInfo.path)

    // const entryKey = this.retrieveFirstAncestorCallerKeyByCallerKey(key) ?? ''
    const arr = this.callerSvc.retrieveTopCallerKeyArrayByCallerKey(dbSourceName, scope, key)
    const entryKey = arr.at(-1) ?? ''

    assert(entryKey, 'entryKey is undefined')

    const value: TrxPropagateOptions = {
      entryKey,
      key,
      dbId: builder.dbId,
      type: propagatingOptions.type,
      path: callerInfo.path,
      className: callerInfo.className,
      funcName: callerInfo.funcName,
      methodName: callerInfo.methodName,
      line: callerInfo.line,
      column: callerInfo.column,
      readRowLockLevel,
      writeRowLockLevel,
      scope,
    }
    Object.freeze(value)
    void Object.defineProperty(builder, QueryBuilderExtKey.trxPropagateOptions, {
      value,
    })

  }

  async propagating(options: PropagatingOptions): Promise<PropagatingRet> {
    const { db, builder } = options

    const { scope } = builder
    assert(scope, 'propagating(): scope is undefined')

    const ret: PropagatingRet = {
      kmoreTrxId: void 0,
    }

    const count = this.getPropagationOptionsCount(db.dbId, scope)
    if (! count) {
      return ret
    }

    const { trxPropagateOptions, trxPropagated, callerKey } = builder
    if (trxPropagated) {
      return ret
    }
    assert(callerKey, 'propagating(): callerKey is undefined')
    const propagatingOptions = this.getPropagationOptions(db.dbId, scope, callerKey)
    if (! propagatingOptions?.type) {
      return ret
    }
    assert(trxPropagateOptions, 'propagating(): trxPropagateOptions is undefined')

    switch (trxPropagateOptions.type) {
      case PropagationType.REQUIRED: {
        const trx = await this._propagatingRequired(options, trxPropagateOptions)
        db.linkQueryIdToTrxId(builder.kmoreQueryId, trx.kmoreTrxId)
        this.builderLinkTrx(options, trx)
        ret.kmoreTrxId = trx.kmoreTrxId
        break
      }

      case PropagationType.SUPPORTS: {
        const trx = await this._propagatingSupports(options, trxPropagateOptions)
        if (trx) {
          db.linkQueryIdToTrxId(builder.kmoreQueryId, trx.kmoreTrxId)
        }
        this.builderLinkTrx(options, trx)
        ret.kmoreTrxId = trx?.kmoreTrxId
        break
      }

      default:
        throw new Error(`Not implemented propagation type "${trxPropagateOptions.type}"`)
    }

    return ret
  }

  protected async _propagatingRequired(options: PropagatingOptions, trxPropagateOptions: TrxPropagateOptions): Promise<KmoreTransaction> {
    const { db, builder } = options
    const { scope } = builder
    assert(scope, 'scope is undefined')

    const dbSourceName = db.dbId
    assert(scope === trxPropagateOptions.scope, 'scope !== trxPropagateOptions.scope')

    let trx = this.getCurrentTrx(dbSourceName, scope, trxPropagateOptions.entryKey)
    if (! trx) {
      trx = await this.startNewTrx({
        scope,
        db,
        trxPropagateOptions,
      })
    }
    assert(trx, 'trx is undefined')
    return trx
  }

  // @Trace<TrxStatusService['_propagatingRequired']>({
  //   scope: ([options, trxPropagateOptions]: [PropagatingOptions, TrxPropagateOptions]) => {
  //   },
  // })
  protected async _propagatingSupports(options: PropagatingOptions, trxPropagateOptions: TrxPropagateOptions): Promise<KmoreTransaction | undefined> {
    const { db, builder } = options
    const { scope } = builder
    assert(scope, 'scope is undefined')
    const dbSourceName = db.dbId

    const key = genCallerKey(trxPropagateOptions.className, trxPropagateOptions.funcName)
    const trx = this.getCurrentTrx(dbSourceName, scope, key)
    if (! trx) { return }

    const trxPropagated = !! trx.trxPropagateOptions

    if (! trxPropagated) {
      Object.defineProperty(trx, QueryBuilderExtKey.trxPropagateOptions, {
        value: trxPropagateOptions,
      })
    }
    return trx
  }

  // #region clean

  cleanAfterRequestFinished(scope: ScopeType): void {
    this.callerSvc.deleteCallerKeyFileMapIndex(scope)
    this.callerKeyPropagationMapIndex.delete(scope)
    this.removeEntryCallerKeyTrxMap(scope)
    this.callerSvc.deleteCallerTreeMapIndex(scope)
  }

  protected cleanAfterTrx(dbSourceName: DbSourceName | undefined, scope: ScopeType, callerKey: CallerKey): void {
    this.entryCallerKeyTrxMapIndex.delete(scope)
    this.callerSvc.deleteCallerTreeMapIndex(scope)
    if (dbSourceName) {
      this.delPropagationOptions(dbSourceName, scope, callerKey)
      this.callerSvc.delFilepathFromCallerKeyFileMapIndex(dbSourceName, scope, callerKey)
      // @FIXME
      // this.removeTrxFromEntryCallerKeyTrxMap(dbSourceName, scope, callerKey)
    }
  }

  // #region builder

  protected builderLinkTrx(
    options: PropagatingOptions,
    trx: KmoreTransaction | undefined,
  ): void {

    trx && linkBuilderWithTrx(options.builder, trx)
  }

  // #region entryCallerKeyTrxMapIndex

  protected getTrxArrayByEntryKey(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): KmoreTransaction[] | undefined {
    const sourceNameMap = this.entryCallerKeyTrxMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }
    return sourceNameMap.get(dbSourceName)?.get(key)
  }

  protected getCurrentTrxByEntryKey(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): KmoreTransaction | undefined {
    const sourceNameMap = this.entryCallerKeyTrxMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }
    const trxArr = sourceNameMap.get(dbSourceName)?.get(key)
    if (! trxArr?.length) { return }
    for (const trx of trxArr) {
      if (! trx.isCompleted()) {
        return trx
      }
    }
  }

  protected updateEntryCallerKeyTrxMap(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey, trx: KmoreTransaction): void {
    let sourceNameMap = this.entryCallerKeyTrxMapIndex.get(scope)
    if (! sourceNameMap) {
      sourceNameMap = new Map()
      this.entryCallerKeyTrxMapIndex.set(scope, sourceNameMap)
    }

    let callerKeyTrxArrayMap = sourceNameMap.get(dbSourceName)
    if (! callerKeyTrxArrayMap) {
      callerKeyTrxArrayMap = new Map()
      sourceNameMap.set(dbSourceName, callerKeyTrxArrayMap)
    }

    let trxArr = callerKeyTrxArrayMap.get(key)
    if (! trxArr) {
      trxArr = []
      callerKeyTrxArrayMap.set(key, trxArr)
    }
    trxArr.push(trx)
  }

  protected removeEntryCallerKeyTrxMap(scope: ScopeType): void {
    this.entryCallerKeyTrxMapIndex.delete(scope)
  }

  protected cleanEntryCallerKeyTrxMapByKey(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): void {
    const sourceNameMap = this.entryCallerKeyTrxMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }

    const callerKeyTrxArrayMap = sourceNameMap.get(dbSourceName)
    if (! callerKeyTrxArrayMap?.size) { return }

    callerKeyTrxArrayMap.delete(key)
  }

  protected removeTrxFromEntryCallerKeyTrxMap(dbSourceName: DbSourceName, scope: ScopeType, trxId: symbol): void {
    const sourceNameMap = this.entryCallerKeyTrxMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }

    const callerKeyTrxArrayMap = sourceNameMap.get(dbSourceName)
    if (! callerKeyTrxArrayMap?.size) { return }

    for (const trxArr of callerKeyTrxArrayMap.values()) {
      const pos = trxArr.findIndex(trx => trx.kmoreTrxId === trxId)
      if (pos === -1) { continue }
      trxArr.splice(pos, 1)
    }
  }


  // #region dbIdTrxIdMapIndex

  getCurrentTrxId(dbSourceName: DbSourceName, scope: ScopeType, callerKey: CallerKey): symbol | undefined {
    const trx = this.getCurrentTrx(dbSourceName, scope, callerKey)
    return trx?.kmoreTrxId
  }

  getCurrentTrx(dbSourceName: DbSourceName, scope: ScopeType, callerKey: CallerKey): KmoreTransaction | undefined {
    const trx = this.getCurrentTrxByEntryKey(dbSourceName, scope, callerKey)
    if (trx) {
      return trx
    }

    const entryKey = this.callerSvc.retrieveFirstAncestorCallerKeyByCallerKey(dbSourceName, scope, callerKey)
    if (! entryKey) { return }
    const trx2 = this.getCurrentTrxByEntryKey(dbSourceName, scope, entryKey)
    if (trx2) {
      return trx2
    }
  }


  // protected getCallerKeysArrayByEntryKey(entryKey: CallerKey): CallerKeyArray | undefined {
  //   return this.callerTreeMap.get(entryKey)
  // }


  // #region callerKeyPropagationMapIndex

  protected getPropagationOptions(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): RegisterTrxPropagateOptions | undefined {
    const sourceNameMap = this.callerKeyPropagationMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }
    const options = sourceNameMap.get(dbSourceName)?.get(key)
    return options
  }

  protected setPropagationOptions(
    key: CallerKey,
    options: RegisterTrxPropagateOptions,
  ): void {

    const { dbSourceName, scope } = options
    assert(dbSourceName, 'dbSourceName is undefined')
    assert(scope, 'scope is undefined')

    let sourceNameMap = this.callerKeyPropagationMapIndex.get(scope)
    if (! sourceNameMap) {
      sourceNameMap = new Map()
      this.callerKeyPropagationMapIndex.set(scope, sourceNameMap)
    }

    let callerKeyPropagationMap = sourceNameMap.get(dbSourceName)
    if (! callerKeyPropagationMap) {
      callerKeyPropagationMap = new Map()
      sourceNameMap.set(dbSourceName, callerKeyPropagationMap)
    }
    callerKeyPropagationMap.set(key, options)
  }

  protected getPropagationOptionsCount(dbSourceName: DbSourceName, scope: ScopeType): number {
    const sourceNameMap = this.callerKeyPropagationMapIndex.get(scope)
    return sourceNameMap?.get(dbSourceName)?.size ?? 0
  }

  protected getPropagationType(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): PropagationType | undefined {
    const options = this.getPropagationOptions(dbSourceName, scope, key)
    return options?.type
  }

  protected delPropagationOptions(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): void {
    this.callerKeyPropagationMapIndex.get(scope)?.get(dbSourceName)?.delete(key)
  }

  protected retrieveRegisteredTopCallerKeyFromCallStack(dbSourceName: DbSourceName, scope: ScopeType, limit = 128): CallerKey | undefined {
    const callers = this.callerSvc.retrieveTopCallerKeyFromCallStack(limit)
    if (! callers.length) { return }

    for (const key of callers) {
      assert(key, 'retrieveRegisteredTopCallerKeyFromCallStack() key is undefined')
      if (this.isRegistered(dbSourceName, scope, key)) {
        return key
      }
    }
  }

  getTraceContextByScope(scope: ScopeType): TraceContext | undefined {
    const traceContextArr = this.scope2TraceContextMap.get(scope)
    return traceContextArr
  }

  /**
   * @param scope kmoreTrxId or kmoreQueryId
   */
  setTraceContextByScope(scope: ScopeType, traceContext: TraceContext): void {
    this.scope2TraceContextMap.set(scope, traceContext)
  }

  removeTraceContextByScope(scope: ScopeType): void {
    this.scope2TraceContextMap.delete(scope)
  }
}

