import assert from 'node:assert'

import { Inject, Singleton } from '@midwayjs/core'
import { Attributes, AttrNames, TraceService } from '@mwcp/otel'
import type { ScopeType } from '@mwcp/share'
import { CallerInfo, genISO8601String, getCallerStack } from '@waiting/shared-core'
import {
  genKmoreTrxId,
  Kmore,
  KmoreQueryBuilder,
  KmoreTransaction,
  PropagationType,
  QueryBuilderExtKey,
  // RowLockLevel,
  TrxPropagateOptions,
} from 'kmore'

import { genTrxRequired } from './propagation/propagating.required.js'
import { genTrxSupports } from './propagation/propagating.supports.js'
import {
  CallerKey,
  CallerKeyFileMapIndex,
  CallerKeyPropagationMapIndex,
  CallerTreeMapIndex,
  TrxIdMapIndex,
  DbSourceName,
  EntryCallerKeyTrxMapIndex,
  FilePath,
  PropagatingOptions,
  PropagatingRet,
  RegisterTrxPropagateOptions,
  // TraceEndOptions,
  TransactionalEntryType,
  TrxStatusServiceBase,
} from './propagation/trx-status.base.js'
import {
  genCallerKey,
  getSimpleCallers,
  linkBuilderWithTrx,
  // trxTrace,
} from './propagation/trx-status.helper.js'
import { ConfigKey, Msg } from './types.js'


const skipMethodNameSet = new Set([
  'aopCallback.around',
  'aopDispatchAsync',
  'aroundAsync',
  'aroundFactory',
  'classDecoratorExecutor',
  'createAsync',
  'registerPropagation',
  'retrieveTopCallerKeyFromCallStack',
])

/**
 * Declarative transaction status manager
 */
@Singleton()
export class TrxStatusService extends TrxStatusServiceBase {

  @Inject() readonly appDir: string
  // @Inject() readonly logger: TraceLogger
  @Inject() readonly traceSvc: TraceService

  protected readonly dbInstanceList = new Map<string, Kmore>()
  protected readonly callerKeyFileMapIndex: CallerKeyFileMapIndex = new Map()
  protected readonly callerKeyPropagationMapIndex: CallerKeyPropagationMapIndex = new Map()
  protected readonly callerTreeMapIndex: CallerTreeMapIndex = new Map()
  protected readonly entryCallerKeyTrxMapIndex: EntryCallerKeyTrxMapIndex = new Map()
  protected readonly trxIdMapIndex: TrxIdMapIndex = new Map()


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
      const firstValue = iterator.next().value as Kmore
      return firstValue
    }
    throw new Error('getDbInstance(): dbId is undefined, but multiple instances exists')
  }

  getDbInstanceCount(): number {
    return this.dbInstanceList.size
  }

  listDbInstanceNames(): string[] {
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

    const key = genCallerKey(options.className, options.funcName)
    const tkey = this.retrieveTopCallerKeyFromCallStack(dbSourceName, scope)
    const type = this.getPropagationType(dbSourceName, scope, key)
    if (type) {
      assert(
        type === options.type,
        `callerKey "${key}" has registered propagation "${type}", but want to register different "${options.type}"`,
      )
      if (tkey) { // has ancestor caller that registered
        this.updateCallerTreeMap(dbSourceName, scope, tkey, key)
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
      this.setPropagationOptions(dbSourceName, key, options)
      if (tkey) { // has ancestor caller that registered
        this.updateCallerTreeMap(dbSourceName, scope, tkey, key)
        event[AttrNames.TransactionalEntryType] = TransactionalEntryType.sub
      }
      else { // top level caller
        this.updateCallerTreeMap(dbSourceName, scope, key, void 0)
        event[AttrNames.TransactionalEntryType] = TransactionalEntryType.top
      }
    }

    // @FIXME
    // trxTrace({
    //   type: 'event',
    //   appDir: this.appDir,
    //   span: void 0,
    //   traceSvc: this.traceSvc,
    //   trxPropagateOptions: options,
    //   attr: event,
    // })

    return key
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
      this.removeLastKeyFromCallerTreeArray(dbSourceName, scope, callerKey)
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

    const trxs = this.getTrxArrayByEntryKey(scope, tkey)
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

      // eslint-disable-next-line no-await-in-loop
      await trx.commit()
      this.removeTrxIdFromDbTrxIdMap(dbSourceName, scope, trx.kmoreTrxId)
      this.cleanAfterTrx(dbSourceName, scope, tkey)

      // @FIXME
      // const { trxPropagateOptions } = trx
      // this.traceEnd({
      //   op: 'commit',
      //   kmoreTrxId: trx.kmoreTrxId,
      //   trxPropagateOptions,
      // })
    }
  }

  // #region Trx Rollback

  async trxRollbackEntry(sourceName: DbSourceName | undefined, scope: ScopeType, callerKey: CallerKey): Promise<void> {
    const dbInstance = this.getDbInstance(sourceName)
    assert(dbInstance, `dbSourceName "${sourceName}" not found`)
    const dbSourceName = dbInstance.dbId
    assert(dbSourceName, 'dbSourceName is undefined')

    const tkeyArr = this.retrieveTopCallerKeyArrayByCallerKey(dbSourceName, scope, callerKey)
    let tkey = callerKey
    if (tkeyArr.length > 0) {
      const key = tkeyArr.at(-1) // pick last one
      if (key) {
        tkey = key
      }
    }

    const trxs = this.getTrxArrayByEntryKey(scope, tkey)
    if (! trxs?.length) {
      this.cleanAfterTrx(void 0, scope, tkey)
      return
    }

    for (const trx of trxs) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await trx.rollback()
      }
      catch (ex) {
        const msg = `ROLLBACK failed for key: "${tkey}". This error will be ignored, continue next trx rollback.`
        console.warn(msg, ex)
        // @FIXME
        // this.logger.error(msg, ex)
      }
      this.removeTrxIdFromDbTrxIdMap(dbSourceName, scope, trx.kmoreTrxId)
      this.cleanAfterTrx(dbSourceName, scope, tkey)

      // @FIXME
      // const { trxPropagateOptions } = trx
      // this.traceEnd({
      //   op: 'rollback',
      //   kmoreTrxId: trx.kmoreTrxId,
      //   trxPropagateOptions,
      // })
    }
  }

  // #region Call stack

  retrieveCallerInfo(distance = 0): CallerInfo {
    const callerInfo = getCallerStack(distance + 1, false)
    return callerInfo
  }

  retrieveTopCallerKeyFromCallStack(dbSourceName: DbSourceName, scope: ScopeType, limit = 128): CallerKey | undefined {
    const callers = getSimpleCallers(limit)
    if (! callers.length) { return }

    for (let i = callers.length - 1; i > 1; i -= 1) {
      const caller = callers[i]
      if (! caller) { continue }
      if (! caller.className || ! caller.funcName) { continue }
      if (caller.funcName.includes('Clz.<')) { continue }
      if (caller.path.startsWith('node:internal')) { continue }
      if (skipMethodNameSet.has(caller.methodName)) { continue }

      const key = genCallerKey(caller.className, caller.funcName)
      if (this.isRegistered(dbSourceName, scope, key)) {
        return key
      }
    }
  }

  // #region CallerKey

  retrieveFirstAncestorCallerKeyByCallerKey(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): CallerKey | undefined {
    const sourceNameMap = this.callerTreeMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }

    const callerTreeMap = sourceNameMap.get(dbSourceName)
    if (! callerTreeMap?.size) { return }

    let ret: CallerKey | undefined
    for (const [pkey, arr] of callerTreeMap.entries()) {
      if (arr.includes(key)) {
        ret = pkey
      }
    }
    return ret
  }

  retrieveTopCallerKeyArrayByCallerKey(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): CallerKey[] {
    const ret: CallerKey[] = []

    const sourceNameMap = this.callerTreeMapIndex.get(scope)
    if (! sourceNameMap?.size) {
      return ret
    }

    const callerTreeMap = sourceNameMap.get(dbSourceName)
    if (! callerTreeMap?.size) {
      return ret
    }

    for (const [tkey, arr] of callerTreeMap.entries()) {
      if (! arr.includes(key)) { continue }

      arr.forEach((kk) => {
        if (kk === tkey) {
          ret.push(tkey)
        }
      })
    }
    return ret
  }

  retrieveUniqueTopCallerKey(sourceName: DbSourceName | undefined, scope: ScopeType, key: CallerKey): CallerKey | undefined {
    const dbInstance = this.getDbInstance(sourceName)
    assert(dbInstance, `dbSourceName "${sourceName}" not found`)
    const dbSourceName = dbInstance.dbId
    assert(dbSourceName, 'dbSourceName is undefined')

    const sourceNameMap = this.callerTreeMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }

    const callerTreeMap = sourceNameMap.get(dbSourceName)
    if (! callerTreeMap?.size) { return }

    let ret: CallerKey | undefined
    for (const [tkey, arr] of callerTreeMap.entries()) {
      if (! arr.includes(key)) { continue }

      for (const kk of arr) {
        if (kk !== tkey) { continue }
        if (ret) { // duplicate
          return
        }
        else {
          ret = tkey
        }
      }
    }
    return ret
  }

  // #region Propagation

  bindBuilderPropagationData(
    dbSourceName: DbSourceName,
    scope: ScopeType,
    builder: KmoreQueryBuilder,
    distance = 0,
  ): void {

    if (builder.trxPropagated) {
      return
    }

    const count = this.getPropagationOptionsCount(dbSourceName, scope)
    if (! count) {
      return
    }

    let callerInfo: CallerInfo | undefined
    try {
      callerInfo = this.retrieveCallerInfo(distance + 1)
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

    this.validateCallerKeyUnique(dbSourceName, scope, key, callerInfo.path)
    this.setFilepathToCallerKeyFileMapIndex(dbSourceName, scope, key, callerInfo.path)

    // const entryKey = this.retrieveFirstAncestorCallerKeyByCallerKey(key) ?? ''
    const arr = this.retrieveTopCallerKeyArrayByCallerKey(dbSourceName, scope, key)
    const entryKey = arr.at(-1) ?? ''

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
    }
    Object.freeze(value)
    void Object.defineProperty(builder, QueryBuilderExtKey.trxPropagateOptions, {
      value,
    })

  }

  async propagating(options: PropagatingOptions): Promise<PropagatingRet> {
    const { db, builder, scope } = options

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
    const propagatingOptions = this.getPropagationOptions(db.dbId, scope, callerKey as CallerKey)
    if (! propagatingOptions?.type) {
      return ret
    }
    assert(trxPropagateOptions, 'propagating(): trxPropagateOptions is undefined')

    switch (trxPropagateOptions.type) {
      case PropagationType.REQUIRED: {
        const trx = await genTrxRequired(this, options, trxPropagateOptions)
        db.linkQueryIdToTrxId(builder.kmoreQueryId, trx.kmoreTrxId)
        this.builderLinkTrx(options, trx)
        ret.kmoreTrxId = trx.kmoreTrxId
        break
      }

      case PropagationType.SUPPORTS: {
        const trx = await genTrxSupports(this, options, trxPropagateOptions)
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

    // this.updateBuilderSpanTag(options.builder) // span not exists this time
    // @FIXME
    // this.updateTrxSpanTag(trxId)
    return ret
  }

  pickActiveTrx(scope: ScopeType, db: Kmore): KmoreTransaction | undefined {
    const dbSourceName = db.dbId
    const trxId = this.getCurrentTrxId(dbSourceName, scope)
    if (trxId) {
      const trx = db.getTrxByTrxId(trxId)
      assert(trx, `trxId "${trxId.toString()}" not found in dbId "${db.dbId}"`)
      return trx
    }
  }

  async startNewTrx(scope: ScopeType, db: Kmore, callerKey: CallerKey): Promise<KmoreTransaction> {
    const kmoreTrxId = genKmoreTrxId('trx-', callerKey)
    assert(kmoreTrxId, `kmoreTrxId is undefined for callerKey "${callerKey}"`)

    const dbSourceName = db.dbId
    assert(dbSourceName, 'dbSourceName is undefined on db')

    const trx: KmoreTransaction = await db.transaction({ kmoreTrxId, trxActionOnError: 'rollback' })
    assert(
      trx.kmoreTrxId === kmoreTrxId,
      `trx.kmoreTrxId "${trx.kmoreTrxId.toString()}" not equal to kmoreTrxId "${kmoreTrxId.toString()}"`,
    )
    try {
      this.updateEntryCallerKeyTrxMap(scope, callerKey, trx)
      this.setCurrentTrxId(dbSourceName, scope, trx.kmoreTrxId)
    }
    catch (ex) {
      await trx.rollback()
      throw ex
    }
    return trx
  }

  // @FIXME
  // updateBuilderSpanRowlockLevelTag(kmoreQueryId: symbol, rowLockLevel: RowLockLevel): void {
  //   const querySpanInfo = this.dbSourceManager.getSpanInfoByKmoreQueryId(kmoreQueryId)
  //   if (querySpanInfo) {
  //     const attr: Attributes = {
  //       rowLockLevel,
  //     }
  //     trxTrace({
  //       type: 'tag',
  //       appDir: this.appDir,
  //       span: querySpanInfo.span,
  //       traceSvc: this.traceSvc,
  //       attr,
  //     })
  //   }
  // getTrxRootSpan(scope: TraceScopeType): Span | undefined {
  // }
  // abstract setTrxRootSpan(scope: TraceScopeType, span: Span): void
  // abstract delTrxRootSpan(scope: TraceScopeType): void

  // #region clean

  cleanAfterRequestFinished(scope: ScopeType): void {
    this.callerKeyFileMapIndex.delete(scope)
    this.callerKeyPropagationMapIndex.delete(scope)
    this.trxIdMapIndex.delete(scope)

    this.entryCallerKeyTrxMapIndex.delete(scope)
    this.callerTreeMapIndex.delete(scope)
  }

  protected cleanAfterTrx(dbSourceName: DbSourceName | undefined, scope: ScopeType, callerKey: CallerKey): void {
    this.entryCallerKeyTrxMapIndex.delete(scope)
    this.callerTreeMapIndex.delete(scope)
    if (dbSourceName) {
      this.delPropagationOptions(dbSourceName, scope, callerKey)
      this.delFilepathFromCallerKeyFileMapIndex(dbSourceName, scope, callerKey)
    }
  }


  // @FIXME
  // protected traceEnd(options: TraceEndOptions): void {
  //   const { kmoreTrxId, op, trxPropagateOptions } = options
  //   if (! trxPropagateOptions) { return }

  //   const attr: Attributes = {
  //     event: AttrNames.TransactionalEnd,
  //     kmoreTrxId: kmoreTrxId.toString(),
  //     op,
  //   }
  //   trxTrace({
  //     type: 'event',
  //     appDir: this.appDir,
  //     span: void 0,
  //     traceSvc: this.traceSvc,
  //     trxPropagateOptions,
  //     attr,
  //   })
  // }

  // #region dbIdTrxIdMapIndex

  protected getCurrentTrxId(dbSourceName: DbSourceName, scope: ScopeType): symbol | undefined {
    return this.trxIdMapIndex.get(scope)?.get(dbSourceName)?.at(-1)
  }

  protected getDbTrxIds(dbSourceName: DbSourceName, scope: ScopeType): symbol[] | undefined {
    return this.trxIdMapIndex.get(scope)?.get(dbSourceName)
  }

  /**
   * Append new trxId to dbIdTrxIdMapIndex,
   * - if exists at last, skip append
   * - if exists in other position, throw Error
   */
  protected setCurrentTrxId(dbSourceName: DbSourceName, scope: ScopeType, trxId: symbol): void {
    let map = this.trxIdMapIndex.get(scope)
    if (! map) {
      map = new Map()
      this.trxIdMapIndex.set(scope, map)
    }
    let arr = map.get(dbSourceName)
    if (! arr) {
      arr = []
      map.set(dbSourceName, arr)
    }

    if (arr.at(-1) === trxId) {
      console.info(`dbSourceName "${dbSourceName}" trxId "${trxId.toString()}" already in last position, skip append`)
      return
    }
    else if (arr.includes(trxId)) {
      throw new Error(`dbSourceName "${dbSourceName}" trxId "${trxId.toString()}" already in array`)
    }

    arr.push(trxId)
  }

  protected removeTrxIdFromDbTrxIdMap(dbSourceName: DbSourceName, scope: ScopeType, trxId: symbol): void {
    const trxIds = this.getDbTrxIds(dbSourceName, scope)
    if (! trxIds?.length) { return }

    const index = trxIds.indexOf(trxId)
    if (index === -1) { return }
    trxIds.splice(index, 1)
  }


  // #region builder

  protected builderLinkTrx(
    options: PropagatingOptions,
    trx: KmoreTransaction | undefined,
  ): void {

    trx && linkBuilderWithTrx(options.builder, trx)
  }

  // @FIXME
  // protected updateTrxSpanTag(trxId?: symbol): void {
  //   if (! trxId) { return }

  //   const querySpanInfo = this.dbSourceManager.trxSpanMap.get(trxId)
  //   if (querySpanInfo) {
  //     const attr: Attributes = {
  //       [AttrNames.TrxPropagated]: true,
  //     }
  //     trxTrace({
  //       type: 'tag',
  //       appDir: this.appDir,
  //       span: querySpanInfo.span,
  //       traceSvc: this.traceSvc,
  //       attr,
  //     })
  //   }
  // }


  protected validateCallerKeyUnique(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey, path: FilePath): void {
    const ret = this.getFilepathFromCallerKeyFileMapIndex(dbSourceName, scope, key)
    if (! ret) { return }
    assert(ret === path, `callerKey "${key}" must unique in all project, but in files:
      - ${path}
      - ${ret}
      Should use different className or funcName`)
  }

  protected getTrxArrayByEntryKey(scope: ScopeType, key: CallerKey): KmoreTransaction[] | undefined {
    return this.entryCallerKeyTrxMapIndex.get(scope)?.get(key)
  }

  protected updateEntryCallerKeyTrxMap(scope: ScopeType, key: CallerKey, trx: KmoreTransaction): void {
    let arr = this.getTrxArrayByEntryKey(scope, key)
    if (! arr) {
      arr = []
      let map = this.entryCallerKeyTrxMapIndex.get(scope)
      if (! map) {
        map = new Map()
        this.entryCallerKeyTrxMapIndex.set(scope, map)
      }
      map.set(key, arr)
    }
    arr.push(trx)
  }


  // protected getCallerKeysArrayByEntryKey(entryKey: CallerKey): CallerKeyArray | undefined {
  //   return this.callerTreeMap.get(entryKey)
  // }

  // #region callerTreeMapIndex

  protected getCallerTreeArray(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): CallerKey[] | undefined {
    const sourceNameMap = this.callerTreeMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }

    const dbSourceCallerTreeMap = sourceNameMap.get(dbSourceName)
    if (! dbSourceCallerTreeMap?.size) { return }

    return dbSourceCallerTreeMap.get(key)
  }

  protected updateCallerTreeMap(dbSourceName: DbSourceName, scope: ScopeType, entryKey: CallerKey, value: CallerKey | undefined): void {
    assert(entryKey, 'entryKey is undefined')

    let sourceNameMap = this.callerTreeMapIndex.get(scope)
    if (! sourceNameMap) {
      sourceNameMap = new Map()
      this.callerTreeMapIndex.set(scope, sourceNameMap)
    }

    let dbSourceCallerTreeMap = sourceNameMap.get(dbSourceName)
    if (! dbSourceCallerTreeMap) {
      dbSourceCallerTreeMap = new Map()
      sourceNameMap.set(dbSourceName, dbSourceCallerTreeMap)
    }

    let arr = dbSourceCallerTreeMap.get(entryKey)
    if (! arr) {
      arr = [entryKey]
      dbSourceCallerTreeMap.set(entryKey, arr)
    }
    assert(arr.length < 1024, `updateCallerTreeMap(): callerTreeMap entryKey "${entryKey}" length > 1024, maybe circular reference`)
    value && arr.push(value)
  }

  protected delLastCallerKeyFromCallerTreeMap(dbSourceName: DbSourceName, scope: ScopeType, entryKey: CallerKey, key: CallerKey): void {
    const callerTreeArray = this.getCallerTreeArray(dbSourceName, scope, entryKey)
    if (! callerTreeArray?.length) { return }

    const pos = callerTreeArray.lastIndexOf(key)
    if (pos === -1) { return }
    callerTreeArray.splice(pos, 1)
  }


  /**
   * If key is not the last one, throw error
   */
  protected removeLastKeyFromCallerTreeArray(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): void {
    const sourceNameMap = this.callerTreeMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }

    const dbSourceCallerTreeMap = sourceNameMap.get(dbSourceName)
    if (! dbSourceCallerTreeMap?.size) { return }

    for (const [tkey, arr] of dbSourceCallerTreeMap.entries()) {
      if (! arr.includes(key)) { continue }
      const lastKey = arr.at(-1)
      assert(lastKey, 'callerTreeMap lastKey is undefined, during trx commit/rollback')

      if (lastKey !== key) {
        throw new Error(`callerTreeMap callerKey "${key}" is not the last one, can not remove, during trx commit/rollback
        - tkey: "${tkey}"
        - last: "${lastKey}"
        `)
      }
      arr.pop()
      return
    }
  }

  // #region callerKeyFileMapIndex

  protected setFilepathToCallerKeyFileMapIndex(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey, path: FilePath): void {
    let sourceNameMap = this.callerKeyFileMapIndex.get(scope)
    if (! sourceNameMap) {
      sourceNameMap = new Map()
      this.callerKeyFileMapIndex.set(scope, sourceNameMap)
    }

    let callerKeyFileMap = sourceNameMap.get(dbSourceName)
    if (! callerKeyFileMap) {
      callerKeyFileMap = new Map()
      sourceNameMap.set(dbSourceName, callerKeyFileMap)
    }
    callerKeyFileMap.set(key, path)
  }

  protected getFilepathFromCallerKeyFileMapIndex(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): FilePath | undefined {
    const sourceNameMap = this.callerKeyFileMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }
    return sourceNameMap.get(dbSourceName)?.get(key)
  }

  protected delFilepathFromCallerKeyFileMapIndex(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): void {
    this.callerKeyFileMapIndex.get(scope)?.get(dbSourceName)?.delete(key)
  }


  // #region callerKeyPropagationMapIndex

  protected getPropagationOptions(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): RegisterTrxPropagateOptions | undefined {
    const sourceNameMap = this.callerKeyPropagationMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }
    const options = sourceNameMap.get(dbSourceName)?.get(key)
    return options
  }

  protected setPropagationOptions(
    dbSourceName: DbSourceName,
    key: CallerKey,
    options: RegisterTrxPropagateOptions,
  ): void {

    const { scope } = options
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
}

