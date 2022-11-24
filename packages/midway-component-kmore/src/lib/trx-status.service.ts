import assert from 'node:assert'
// import { isProxy } from 'node:util/types'

import { Inject, Provide } from '@midwayjs/decorator'
import { Attributes, AttrNames, TraceLogger, TraceService } from '@mwcp/otel'
import { CallerInfo, genISO8601String, getCallerStack } from '@waiting/shared-core'
import {
  genKmoreTrxId,
  Kmore,
  KmoreQueryBuilder,
  KmoreTransaction,
  PropagationType,
  QueryBuilderExtKey,
  RowLockLevel,
  TrxPropagateOptions,
} from 'kmore'

import { DbSourceManager } from './db-source-manager'
import { genTrxRequired } from './propagation/propagating.required'
import { genTrxSupports } from './propagation/propagating.supports'
import {
  CallerKey,
  CallerKeyFileMap,
  CallerKeyPropagationMap,
  CallerTreeMap,
  EntryCallerKeyTrxMap,
  FilePath,
  PropagatingOptions,
  PropagatingRet,
  RegisterTrxPropagateOptions,
  TraceEndOptions,
  TransactionalEntryType,
  TrxStatusServiceBase,
} from './propagation/trx-status.base'
import {
  genCallerKey,
  getSimpleCallers,
  linkBuilderWithTrx,
  trxTrace,
} from './propagation/trx-status.helper'


const skipMethodNameSet = new Set([
  'aroundFactory',
  'classDecoratorExecuctor',
  'registerPropagation',
  'retrieveTopCallerKeyFromCallStack',
  'transactionalDecoratorExector',
])

/**
 * Declaritive transaction status manager
 */
@Provide()
export class TrxStatusService extends TrxStatusServiceBase {

  @Inject() readonly appDir: string
  @Inject() readonly dbSourceManager: DbSourceManager
  @Inject() readonly logger: TraceLogger
  @Inject() readonly traceSvc: TraceService

  errorMsg = ''

  protected readonly callerKeyFileMap: CallerKeyFileMap = new Map()
  protected readonly callerKeyPropagationMap: CallerKeyPropagationMap = new Map()
  protected readonly dbIdTrxIdMap: Map<string, symbol[]> = new Map()
  protected readonly entryCallerKeyTrxMap: EntryCallerKeyTrxMap = new Map()
  protected readonly callerTreeMap: CallerTreeMap = new Map()

  getName(): string { return 'trxStatusService' }

  registerPropagation(options: RegisterTrxPropagateOptions): CallerKey {
    const event: Attributes = {
      event: AttrNames.TransactionalRegister,
      time: genISO8601String(),
      [AttrNames.TrxPropagationReadRowLockLevel]: options.readRowLockLevel,
      [AttrNames.TrxPropagationWriteRowLockLevel]: options.writeRowLockLevel,
    }

    const key = genCallerKey(options.className, options.funcName)
    const tkey = this.retrieveTopCallerKeyFromCallStack()
    const type = this.getPropagationType(key)
    if (type) {
      assert(
        type === options.type,
        `callerKey "${key}" has registered propagation "${type}", but want to register different "${options.type}"`,
      )
      if (tkey) { // has ancestor caller that registered
        this.updateCallerTreeMap(tkey, key)
      }
      else { // getCallerStack will return insufficient sites if calling self without "await", so not top level caller
        // this.updateCallerTreeMapWithExistsKey(key)
        const msg = `Insufficient call stacks by getCallerStack, maybe calling self without "await",
        Result of Query Builder MUST be "await"ed within Transactional derorator method.
        callerKey: "${key}"
        `
        this.errorMsg = msg
        const err = new Error(msg)
        this.traceSvc.setRootSpanWithError(err)
        throw err
      }
      event[AttrNames.TransactionalEntryType] = TransactionalEntryType.sub
    }
    else {
      this.setPropagationOptions(key, options)
      if (tkey) { // has ancestor caller that registered
        this.updateCallerTreeMap(tkey, key)
        event[AttrNames.TransactionalEntryType] = TransactionalEntryType.sub
      }
      else { // top level caller
        this.updateCallerTreeMap(key, void 0)
        event[AttrNames.TransactionalEntryType] = TransactionalEntryType.top
      }
    }

    trxTrace({
      type: 'event',
      appDir: this.appDir,
      span: void 0,
      traceSvc: this.traceSvc,
      trxPropagateOptions: options,
      attr: event,
    })

    return key
  }

  async trxCommitIfEntryTop(callerKey: CallerKey): Promise<void> {
    let tkey = this.retrieveUniqueTopCallerKey(callerKey)
    if (! tkey) {
      const tkeyArr = this.retrieveTopCallerKeyArrayByCallerKey(callerKey)

      if (! tkeyArr.length) {
        throw new Error(`callerKey "${callerKey}" is not registered or not top level caller`)
        // return
      }
      else if (tkeyArr.length > 1) { // multiple callings
        this.removeLastKeyFromCallerTreeArray(callerKey)
        return
      }
      tkey = tkeyArr[0]
      assert(tkey, 'tkey is undefined')
      if (tkey !== callerKey) { return }
    }

    if (callerKey !== tkey) {
      this.removeLastKeyFromCallerTreeArray(callerKey)
      return
    }

    const trxs = this.getTrxArrayByEntryKey(tkey)
    if (! trxs || ! trxs.length) {
      this.cleanAfterTrx(tkey)
      return
    }

    if (this.errorMsg) {
      this.logger.error(`ROLLBACK when commit top entry for key: "${tkey}"`, this.errorMsg)
      return this.trxRollbackEntry(callerKey)
    }

    for (let i = trxs.length - 1; i >= 0; i -= 1) {
      const trx = trxs[i]
      if (! trx) { continue }

      const { trxPropagateOptions } = trx
      // eslint-disable-next-line no-await-in-loop
      await trx.commit()
      this.removeTrxIdFromDbIdMap(trx.dbId, trx.kmoreTrxId)

      this.traceEnd({
        op: 'commit',
        kmoreTrxId: trx.kmoreTrxId,
        trxPropagateOptions,
      })
    }
    this.cleanAfterTrx(tkey)
  }

  async trxRollbackEntry(callerKey: CallerKey): Promise<void> {
    // const tkeyArr = this.retrieveTopCallerKeyArrayByCallerKey(callerKey) ?? callerKey
    const tkeyArr = this.retrieveTopCallerKeyArrayByCallerKey(callerKey)
    let tkey = callerKey
    if (tkeyArr.length > 0) {
      const key = tkeyArr.at(-1) // pick last one
      if (key) {
        tkey = key
      }
    }

    const trxs = this.getTrxArrayByEntryKey(tkey)
    if (! trxs || ! trxs.length) {
      this.cleanAfterTrx(tkey)
      return
    }

    for (let i = 0, len = trxs.length; i < len; i += 1) {
      const trx = trxs[i]
      if (! trx) { continue }

      const { trxPropagateOptions } = trx
      try {
        // eslint-disable-next-line no-await-in-loop
        await trx.rollback()
      }
      catch (ex) {
        const msg = `ROLLBACK failed for key: "${tkey}". This error will be ignored, continue next trx rollback.`
        this.logger.error(msg, ex)
      }
      this.removeTrxIdFromDbIdMap(trx.dbId, trx.kmoreTrxId)

      this.traceEnd({
        op: 'rollback',
        kmoreTrxId: trx.kmoreTrxId,
        trxPropagateOptions,
      })
    }

    this.cleanAfterTrx(tkey)
  }


  retrieveTopCallerKeyFromCallStack(limit = 64): CallerKey | undefined {
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
      if (this.isRegistered(key)) {
        return key
      }
    }
  }

  retrieveFirstAncestorCallerKeyByCallerKey(key: CallerKey): CallerKey | undefined {
    if (! this.callerTreeMap.size) { return }

    let ret: CallerKey | undefined
    for (const [pkey, arr] of this.callerTreeMap.entries()) {
      if (arr.includes(key)) {
        ret = pkey
      }
    }
    return ret
  }

  retrieveTopCallerKeyArrayByCallerKey(key: CallerKey): CallerKey[] {
    const ret: CallerKey[] = []
    if (! this.callerTreeMap.size) {
      return ret
    }

    for (const [tkey, arr] of this.callerTreeMap.entries()) {
      if (! arr.includes(key)) { continue }

      arr.forEach((kk) => {
        if (kk === tkey) {
          ret.push(tkey)
        }
      })
    }
    return ret
  }

  retrieveUniqueTopCallerKey(key: CallerKey): CallerKey | undefined {
    if (! this.callerTreeMap.size) { return }

    let ret: CallerKey | undefined
    for (const [tkey, arr] of this.callerTreeMap.entries()) {
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


  bindBuilderPropagationData(
    builder: KmoreQueryBuilder,
    distance = 0,
  ): KmoreQueryBuilder {

    if (builder.trxPropagated) {
      return builder
    }

    const callerInfo = this.retrieveCallerInfo(distance + 1)
    if (! callerInfo.className || ! callerInfo.funcName) {
      return builder
    }

    const key = genCallerKey(callerInfo.className, callerInfo.funcName)
    const propagatingOptions = this.getPropagationOptions(key)
    if (! propagatingOptions?.type) {
      return builder
    }
    const { readRowLockLevel, writeRowLockLevel } = propagatingOptions

    this.validateCallerKeyUnique(key, callerInfo.path)
    this.callerKeyFileMap.set(key, callerInfo.path)

    const value: TrxPropagateOptions = {
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
      configurable: false,
      enumerable: false,
      writable: false,
      value,
    })

    return builder
  }


  async propagating(options: PropagatingOptions): Promise<PropagatingRet> {
    const { trxPropagateOptions, trxPropagated } = options.builder
    assert(trxPropagateOptions, 'trxPropagateOptions is undefined')

    if (trxPropagated) {
      return {
        builder: options.builder,
        kmoreTrxId: void 0,
      }
    }

    let trxId: symbol | undefined
    let ret: PropagatingRet

    switch (trxPropagateOptions.type) {
      case PropagationType.REQUIRED: {
        const trx = await genTrxRequired(this, options, trxPropagateOptions)
        ret = this.builderLinkTrx(options, trx)
        trxId = trx.kmoreTrxId
        break
      }

      case PropagationType.SUPPORTS: {
        const trx = await genTrxSupports(this, options, trxPropagateOptions)
        ret = this.builderLinkTrx(options, trx)
        trxId = trx?.kmoreTrxId
        break
      }

      default:
        throw new Error(`Not implemented propagation type "${trxPropagateOptions.type}"`)
    }

    // this.updateBuilderSpanTag(options.builder) // span not exists this time
    this.updateTrxSpanTag(trxId)
    return ret
  }

  isRegistered(key: CallerKey): boolean {
    return this.callerKeyPropagationMap.has(key)
  }

  retrieveCallerInfo(distance = 0): CallerInfo {
    const callerInfo = getCallerStack(distance + 1, false)
    return callerInfo
  }

  pickActiveTrx(db: Kmore): KmoreTransaction | undefined {
    const trxId = this.getActiveTrxId(db.dbId)
    if (trxId) {
      const trx = db.getTrxByKmoreTrxId(trxId)
      assert(trx, `trxId "${trxId.toString()}" not found in dbId "${db.dbId}"`)
      return trx
    }
  }

  async startNewTrx(db: Kmore, callerKey: CallerKey): Promise<KmoreTransaction> {
    const kmoreTrxId = genKmoreTrxId('trx-', callerKey)
    assert(kmoreTrxId, `kmoreTrxId is undefined for callerKey "${callerKey}"`)

    const trx: KmoreTransaction = await db.transaction({ kmoreTrxId, trxActionOnEnd: 'rollback' })
    assert(
      trx.kmoreTrxId === kmoreTrxId,
      `trx.kmoreTrxId "${trx.kmoreTrxId.toString()}" not equal to kmoreTrxId "${kmoreTrxId.toString()}"`,
    )
    try {
      this.updateEntryCallerKeyTrxMap(callerKey, trx)
      this.setActiveTrxId(db.dbId, trx.kmoreTrxId)
    }
    catch (ex) {
      await trx.rollback()
      throw ex
    }
    return trx
  }

  updateBuilderSpanRowlockLevelTag(kmoreQueryId: symbol, rowLockLevel: RowLockLevel): void {
    const querySpanInfo = this.dbSourceManager.getSpanInfoByKmoreQueryId(kmoreQueryId)
    if (querySpanInfo) {
      const attr: Attributes = {
        rowLockLevel,
      }
      trxTrace({
        type: 'tag',
        appDir: this.appDir,
        span: querySpanInfo.span,
        traceSvc: this.traceSvc,
        attr,
      })
    }
  }


  /* --------- protected methods --------- */

  protected traceEnd(options: TraceEndOptions): void {
    const { kmoreTrxId, op, trxPropagateOptions } = options
    if (! trxPropagateOptions) { return }

    const attr: Attributes = {
      event: AttrNames.TransactionalEnd,
      kmoreTrxId: kmoreTrxId.toString(),
      op,
    }
    trxTrace({
      type: 'event',
      appDir: this.appDir,
      span: void 0,
      traceSvc: this.traceSvc,
      trxPropagateOptions,
      attr,
    })
  }

  protected getActiveTrxId(dbId: string): symbol | undefined {
    return this.dbIdTrxIdMap.get(dbId)?.at(-1)
  }

  /**
   * Append new trxId to dbIdTrxIdMap,
   * - If exists at last, skip append
   * - If exists in other position, throw Error
   */
  protected setActiveTrxId(dbId: string, trxId: symbol): void {
    let arr = this.dbIdTrxIdMap.get(dbId)
    if (! arr) {
      arr = []
      this.dbIdTrxIdMap.set(dbId, arr)
    }

    if (arr.at(-1) === trxId) {
      console.info(`dbId "${dbId}" trxId "${trxId.toString()}" already in last position, skip append`)
      return
    }
    else if (arr.includes(trxId)) {
      throw new Error(`dbId "${dbId}" trxId "${trxId.toString()}" already in array`)
    }

    arr.push(trxId)
  }


  protected builderLinkTrx(
    options: PropagatingOptions,
    trx: KmoreTransaction | undefined,
  ): PropagatingRet {

    const builder = trx ? linkBuilderWithTrx(options.builder, trx) : options.builder
    const ret: PropagatingRet = {
      builder,
      kmoreTrxId: trx?.kmoreTrxId,
    }
    return ret
  }

  protected updateTrxSpanTag(trxId?: symbol): void {
    if (! trxId) { return }

    const querySpanInfo = this.dbSourceManager.trxSpanMap.get(trxId)
    if (querySpanInfo) {
      const attr: Attributes = {
        [AttrNames.TrxPropagated]: true,
      }
      trxTrace({
        type: 'tag',
        appDir: this.appDir,
        span: querySpanInfo.span,
        traceSvc: this.traceSvc,
        attr,
      })
    }
  }

  protected getPropagationType(key: CallerKey): PropagationType | undefined {
    const options = this.callerKeyPropagationMap.get(key)
    return options?.type
  }

  getPropagationOptions(key: CallerKey): RegisterTrxPropagateOptions| undefined {
    const options = this.callerKeyPropagationMap.get(key)
    return options
  }

  protected setPropagationOptions(
    key: CallerKey,
    options: RegisterTrxPropagateOptions,
  ): void {

    this.callerKeyPropagationMap.set(key, options)
  }

  protected delPropagationOptions(key: CallerKey): void {
    this.callerKeyPropagationMap.delete(key)
  }

  protected validateCallerKeyUnique(key: CallerKey, path: FilePath): void {
    const ret = this.callerKeyFileMap.get(key)
    if (! ret) { return }
    assert(ret === path, `callerKey "${key}" must unique in all project, but in files:
      - ${path}
      - ${ret}
      Should use different className or funcName`)
  }

  protected getTrxArrayByEntryKey(key: CallerKey): KmoreTransaction[] | undefined {
    return this.entryCallerKeyTrxMap.get(key)
  }

  protected updateEntryCallerKeyTrxMap(key: CallerKey, trx: KmoreTransaction): void {
    let arr = this.getTrxArrayByEntryKey(key)
    if (! arr) {
      arr = []
      this.entryCallerKeyTrxMap.set(key, arr)
    }
    arr.push(trx)
  }


  // protected getCallerKeysArrayByEntryKey(entryKey: CallerKey): CallerKeyArray | undefined {
  //   return this.callerTreeMap.get(entryKey)
  // }

  protected updateCallerTreeMap(entryKey: CallerKey, value: CallerKey | undefined): void {
    assert(entryKey, 'entryKey is undefined')
    let arr = this.callerTreeMap.get(entryKey)
    if (! arr) {
      arr = [entryKey]
      this.callerTreeMap.set(entryKey, arr)
    }
    if (arr.length > 1024) {
      throw new Error(`callerTreeMap entryKey "${entryKey}" length > 1024, maybe circular reference`)
    }
    value && arr.push(value)
  }

  protected updateCallerTreeMapWithExistsKey(entryKey: CallerKey): void {
    assert(entryKey, 'entryKey is undefined')
    const arr = this.callerTreeMap.get(entryKey)
    if (! arr) {
      throw new Error(`entryKey "${entryKey}" not exists in callerTreeMap, but should exists for multiple entry`)
    }
    else if (! arr.includes(entryKey)) {
      throw new Error(`entryKey "${entryKey}" not in callerTreeMap, but should exists for multiple entry`)
    }
    arr.push(entryKey)
  }

  protected delLastCallerKeyFromCallerTreeMap(entryKey: CallerKey, key: CallerKey): void {
    const arr = this.callerTreeMap.get(entryKey)
    if (! arr || ! arr.length) { return }
    const pos = arr.lastIndexOf(key)
    if (pos === -1) { return }
    arr.splice(pos, 1)
  }


  protected removeTrxIdFromDbIdMap(dbId: string, trxId: symbol): void {
    const trxIds = this.dbIdTrxIdMap.get(dbId)
    if (! trxIds) { return }
    const index = trxIds.indexOf(trxId)
    if (index === -1) { return }
    trxIds.splice(index, 1)
  }

  /**
   * If key is not the last one, throw error
   */
  protected removeLastKeyFromCallerTreeArray(key: CallerKey): void {
    if (! this.callerTreeMap.size) { return }

    for (const [tkey, arr] of this.callerTreeMap.entries()) {
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

  protected cleanAfterTrx(callerKey: CallerKey): void {
    this.entryCallerKeyTrxMap.delete(callerKey)
    this.callerTreeMap.delete(callerKey)
    this.delPropagationOptions(callerKey)
  }


}

