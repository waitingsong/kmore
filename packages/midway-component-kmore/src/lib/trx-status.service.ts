import assert from 'node:assert'
// import { isProxy } from 'node:util/types'

import { Inject, Singleton } from '@midwayjs/core'
import { Attributes, AttrNames, TraceAppLogger, OtelComponent, Span } from '@mwcp/otel'
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
  FilePath,
  PropagatingOptions,
  PropagatingRet,
  RegisterTrxPropagateOptions,
  TraceEndOptions,
  TransactionalEntryType,
  AbstractTrxStatusService,
  CallerKeyPropagationMapIndex,
  DbIdTrxIdMapIndex,
  EntryCallerKeyTrxMapIndex,
  CallerKeyFileMapIndex,
  RegisterTrxContext,
  CallerTreeMapIndex,
  CallerTreeMap,
  CallerKeyArray,
} from './propagation/trx-status.abstract'
import {
  genCallerKey,
  getSimpleCallers,
  linkBuilderWithTrx,
  trxTrace,
} from './propagation/trx-status.helper'
import { Msg } from './types'


const skipMethodNameSet = new Set([
  'aroundFactory',
  'classDecoratorExecuctor',
  'registerPropagation',
  'retrieveTopCallerKeyFromCallStack',
  'transactionalDecoratorExector',
])

/**
 * Singleton Declaritive transaction status manager
 */
@Singleton()
export class TrxStatusService extends AbstractTrxStatusService {

  @Inject() readonly appDir: string
  @Inject() readonly dbSourceManager: DbSourceManager
  // @Inject() readonly logger: TraceLogger
  @Inject() readonly logger: TraceAppLogger
  @Inject() readonly otel: OtelComponent

  readonly errorMsgMapIndex = new WeakMap<RegisterTrxContext, string>()

  protected readonly callerKeyFileMapIndex: CallerKeyFileMapIndex = new Map()
  protected readonly callerKeyPropagationMapIndex: CallerKeyPropagationMapIndex = new Map()
  protected readonly callerTreeMapIndex: CallerTreeMapIndex = new Map()
  protected readonly dbIdTrxIdMapIndex: DbIdTrxIdMapIndex = new Map()
  protected readonly entryCallerKeyTrxMapIndex: EntryCallerKeyTrxMapIndex = new Map()
  protected readonly trxRootSpanWeakMap = new WeakMap<RegisterTrxContext, Span>()

  getName(): string { return 'trxStatusService' }

  registerPropagation(options: RegisterTrxPropagateOptions): CallerKey {
    const event: Attributes = {
      event: AttrNames.TransactionalRegister,
      time: genISO8601String(),
      [AttrNames.TrxPropagationReadRowLockLevel]: options.readRowLockLevel,
      [AttrNames.TrxPropagationWriteRowLockLevel]: options.writeRowLockLevel,
    }

    const { regContext, span } = options
    assert(regContext, 'regContext is undefined')

    if (span) {
      this.setTrxRootSpan(regContext, span)
    }

    const key = genCallerKey(options.className, options.funcName)
    const tkey = this.retrieveTopCallerKeyFromCallStack(regContext)
    const type = this.getPropagationType(regContext, key)
    if (type) {
      assert(
        type === options.type,
        `callerKey "${key}" has registered propagation "${type}", but want to register different "${options.type}"`,
      )
      if (tkey) { // has ancestor caller that registered
        this.updateCallerTreeMap(regContext, tkey, key)
      }
      else { // getCallerStack will return insufficient sites if calling self without "await", so not top level caller
        // this.updateCallerTreeMapWithExistsKey(key)
        const msg = `${Msg.insufficientCallstacks}. Maybe calling self without "await",
        Result of Query Builder MUST be "await"ed within Transactional derorator method.
        callerKey: "${key}"
        `
        this.setErrorMsg(regContext, msg)
        const err = new Error(msg)
        span && this.otel.setSpanWithError(void 0, span, err)
        throw err
      }
      event[AttrNames.TransactionalEntryType] = TransactionalEntryType.sub
    }
    else {
      this.setPropagationOptions(key, options)

      if (tkey) { // has ancestor caller that registered
        this.updateCallerTreeMap(regContext, tkey, key)
        event[AttrNames.TransactionalEntryType] = TransactionalEntryType.sub
      }
      else { // top level caller
        this.updateCallerTreeMap(regContext, key, void 0)
        event[AttrNames.TransactionalEntryType] = TransactionalEntryType.top
      }
    }

    trxTrace({
      type: 'event',
      appDir: this.appDir,
      attr: event,
      otel: this.otel,
      span,
      trxPropagateOptions: options,
    })

    return key
  }

  async trxCommitIfEntryTop(regContext: RegisterTrxContext, callerKey: CallerKey): Promise<void> {
    let tkey = this.retrieveUniqueTopCallerKey(regContext, callerKey)
    if (! tkey) {
      const tkeyArr = this.retrieveTopCallerKeyArrayByCallerKey(regContext, callerKey)

      if (! tkeyArr.length) {
        const msg = `${Msg.callerKeyNotRegisteredOrNotEntry}: "${callerKey}".
        Maybe calling self without "await", or has been removed with former error.`
        const span = this.getTrxRootSpan(regContext)
        this.logger.error(msg, span)
        throw new Error(msg)
        // return
      }
      else if (tkeyArr.length > 1) { // multiple callings
        this.removeLastKeyFromCallerTreeArray(regContext, callerKey)
        return
      }
      tkey = tkeyArr[0]
      assert(tkey, 'tkey is undefined')
      if (tkey !== callerKey) { return }
    }

    if (callerKey !== tkey) {
      this.removeLastKeyFromCallerTreeArray(regContext, callerKey)
      return
    }

    const trxs = this.getTrxArrayByEntryKey(regContext, tkey)
    if (! trxs?.length) {
      this.cleanAfterTrx(regContext, tkey)
      return
    }

    const span = this.getTrxRootSpan(regContext)

    const errorMsg = this.getErrorMsg(regContext)
    if (errorMsg) {
      this.logger.error(`ROLLBACK when commit top entry for key: "${tkey}"`, span, errorMsg)
      return this.trxRollbackEntry(regContext, callerKey)
    }

    for (let i = trxs.length - 1; i >= 0; i -= 1) {
      const trx = trxs[i]
      if (! trx) { continue }

      const { trxPropagateOptions } = trx
      // eslint-disable-next-line no-await-in-loop
      await trx.commit()
      this.removeTrxIdFromDbIdMap(regContext, trx.dbId, trx.kmoreTrxId)

      this.traceEnd({
        op: 'commit',
        kmoreTrxId: trx.kmoreTrxId,
        span,
        trxPropagateOptions,
      })
    }
    this.cleanAfterTrx(regContext, tkey)
  }

  async trxRollbackEntry(regContext: RegisterTrxContext, callerKey: CallerKey): Promise<void> {
    // const tkeyArr = this.retrieveTopCallerKeyArrayByCallerKey(callerKey) ?? callerKey
    const tkeyArr = this.retrieveTopCallerKeyArrayByCallerKey(regContext, callerKey)
    let tkey = callerKey
    if (tkeyArr.length > 0) {
      const key = tkeyArr.at(-1) // pick last one
      if (key) {
        tkey = key
      }
    }

    const trxs = this.getTrxArrayByEntryKey(regContext, tkey)
    if (! trxs?.length) {
      this.cleanAfterTrx(regContext, tkey)
      return
    }

    const span = this.getTrxRootSpan(regContext)

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
        this.logger.error(msg, span, ex)
      }
      this.removeTrxIdFromDbIdMap(regContext, trx.dbId, trx.kmoreTrxId)

      this.traceEnd({
        op: 'rollback',
        kmoreTrxId: trx.kmoreTrxId,
        span,
        trxPropagateOptions,
      })
    }

    this.cleanAfterTrx(regContext, tkey)
  }


  retrieveTopCallerKeyFromCallStack(
    regContext: RegisterTrxContext,
    limit = 64,
  ): CallerKey | undefined {

    const callers = getSimpleCallers(limit)
    if (! callers.length) { return }

    assert(regContext, 'regContext is undefined')

    for (let i = callers.length - 1; i > 1; i -= 1) {
      const caller = callers[i]
      if (! caller) { continue }
      if (! caller.className || ! caller.funcName) { continue }
      if (caller.funcName.includes('Clz.<')) { continue }
      if (caller.path.startsWith('node:internal')) { continue }
      if (skipMethodNameSet.has(caller.methodName)) { continue }

      const key = genCallerKey(caller.className, caller.funcName)
      if (this.isRegistered(regContext, key)) {
        return key
      }
    }
  }

  retrieveFirstAncestorCallerKeyByCallerKey(regContext: RegisterTrxContext, key: CallerKey): CallerKey | undefined {
    const map = this.getCallerTreeMap(regContext)
    if (! map?.size) { return }

    let ret: CallerKey | undefined
    for (const [pkey, arr] of map.entries()) {
      if (arr.includes(key)) {
        ret = pkey
      }
    }
    return ret
  }

  retrieveTopCallerKeyArrayByCallerKey(regContext: RegisterTrxContext, key: CallerKey): CallerKey[] {
    const ret: CallerKey[] = []

    const map = this.getCallerTreeMap(regContext)
    if (! map?.size) {
      return ret
    }

    for (const [tkey, arr] of map.entries()) {
      if (! arr.includes(key)) { continue }

      arr.forEach((kk) => {
        if (kk === tkey) {
          ret.push(tkey)
        }
      })
    }
    return ret
  }

  retrieveUniqueTopCallerKey(regContext: RegisterTrxContext, key: CallerKey): CallerKey | undefined {
    const map = this.getCallerTreeMap(regContext)
    if (! map?.size) { return }

    let ret: CallerKey | undefined
    for (const [tkey, arr] of map.entries()) {
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
    regContext: RegisterTrxContext,
    builder: KmoreQueryBuilder,
    distance = 0,
  ): KmoreQueryBuilder {

    assert(regContext, 'regContext is required')

    if (builder.trxPropagated) {
      return builder
    }

    const count = this.getPropagationOptionsCount(regContext)
    if (! count) {
      return builder
    }

    let callerInfo: CallerInfo | undefined
    try {
      callerInfo = this.retrieveCallerInfo(distance + 1)
      if (! callerInfo.className || ! callerInfo.funcName) {
        return builder
      }
    }
    catch (ex) {
      console.warn('[@mwcp/kmore] retrieveCallerInfo failed', ex)
      return builder
    }

    const key = genCallerKey(callerInfo.className, callerInfo.funcName)
    const propagatingOptions = this.getPropagationOptions(regContext, key)
    if (! propagatingOptions?.type) {
      return builder
    }
    const { readRowLockLevel, writeRowLockLevel } = propagatingOptions

    this.validateCallerKeyUnique(regContext, key, callerInfo.path)
    this.setFilePathToCallerKeyFileMapIndex(regContext, key, callerInfo.path)

    // const entryKey = this.retrieveFirstAncestorCallerKeyByCallerKey(key) ?? ''
    const entryKey = this.retrieveTopCallerKeyArrayByCallerKey(regContext, key).at(-1) ?? ''

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

  isRegistered(
    regContext: RegisterTrxContext,
    key: CallerKey,
  ): boolean {

    assert(regContext, 'regContext is required')
    const map = this.callerKeyPropagationMapIndex.get(regContext)
    if (! map) { return false }
    const ret = map.has(key)
    return ret
  }

  retrieveCallerInfo(distance = 0): CallerInfo {
    const callerInfo = getCallerStack(distance + 1, false)
    return callerInfo
  }

  pickActiveTrx(regContext: RegisterTrxContext, db: Kmore): KmoreTransaction | undefined {
    const trxId = this.getActiveTrxId(regContext, db.dbId)
    if (trxId) {
      const trx = db.getTrxByKmoreTrxId(trxId)
      assert(trx, `trxId "${trxId.toString()}" not found in dbId "${db.dbId}"`)
      return trx
    }
  }

  async startNewTrx(regContext: RegisterTrxContext, db: Kmore, callerKey: CallerKey): Promise<KmoreTransaction> {
    const kmoreTrxId = genKmoreTrxId('trx-', callerKey)
    assert(kmoreTrxId, `kmoreTrxId is undefined for callerKey "${callerKey}"`)

    const trx: KmoreTransaction = await db.transaction({ kmoreTrxId, trxActionOnEnd: 'rollback' })
    assert(
      trx.kmoreTrxId === kmoreTrxId,
      `trx.kmoreTrxId "${trx.kmoreTrxId.toString()}" not equal to kmoreTrxId "${kmoreTrxId.toString()}"`,
    )
    try {
      this.updateEntryCallerKeyTrxMap(regContext, callerKey, trx)
      this.setActiveTrxId(regContext, db.dbId, trx.kmoreTrxId)
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
        attr,
        span: querySpanInfo.span,
        otel: this.otel,
      })
    }
  }


  getFilePathFromCallerKeyFileMapIndex(
    regContext: RegisterTrxContext,
    key: CallerKey,
  ): string {

    const map = this.callerKeyFileMapIndex.get(regContext)
    if (! map) { return '' }
    return map.get(key) ?? ''
  }

  setFilePathToCallerKeyFileMapIndex(
    regContext: RegisterTrxContext,
    key: CallerKey,
    filePath: string,
  ): void {

    let map = this.callerKeyFileMapIndex.get(regContext)
    if (! map) {
      map = new Map()
      this.callerKeyFileMapIndex.set(regContext, map)
    }
    map.set(key, filePath)
  }


  getPropagationOptions(
    regContext: RegisterTrxContext,
    key: CallerKey,
  ): RegisterTrxPropagateOptions | undefined {

    const map = this.callerKeyPropagationMapIndex.get(regContext)
    if (! map) { return }
    const ret = map.get(key)
    return ret
  }

  setPropagationOptions(
    key: CallerKey,
    options: RegisterTrxPropagateOptions,
  ): void {

    const { regContext } = options
    assert(regContext, 'regContext is required')

    let map = this.callerKeyPropagationMapIndex.get(regContext)
    if (! map) {
      map = new Map()
      this.callerKeyPropagationMapIndex.set(regContext, map)
    }
    map.set(key, options)
  }

  delPropagationOptions(
    regContext: RegisterTrxContext,
    key: CallerKey,
  ): void {

    const map = this.callerKeyPropagationMapIndex.get(regContext)
    if (! map) { return }
    map.delete(key)
  }

  getTrxRootSpan(regContext: RegisterTrxContext): Span | undefined {
    return this.trxRootSpanWeakMap.get(regContext)
  }

  setTrxRootSpan(regContext: RegisterTrxContext, span: Span): void {
    this.trxRootSpanWeakMap.set(regContext, span)
  }

  cleanAfterRequestFinished(regContext: RegisterTrxContext): void {
    this.callerKeyFileMapIndex.delete(regContext)
    this.callerKeyPropagationMapIndex.delete(regContext)
    this.callerTreeMapIndex.delete(regContext)
    this.entryCallerKeyTrxMapIndex.delete(regContext)
    this.errorMsgMapIndex.delete(regContext)
    this.trxRootSpanWeakMap.delete(regContext)
  }

  override delTrxRootSpan(regContext: RegisterTrxContext): void {
    this.trxRootSpanWeakMap.delete(regContext)
  }

  /* --------- protected methods --------- */

  protected traceEnd(options: TraceEndOptions): void {
    const { kmoreTrxId, op, trxPropagateOptions, span } = options
    if (! trxPropagateOptions) { return }

    const attr: Attributes = {
      event: AttrNames.TransactionalEnd,
      kmoreTrxId: kmoreTrxId.toString(),
      op,
    }
    trxTrace({
      type: 'event',
      appDir: this.appDir,
      attr,
      otel: this.otel,
      span,
      trxPropagateOptions,
    })
  }

  protected getActiveTrxId(regContext: RegisterTrxContext, dbId: string): symbol | undefined {
    const map = this.dbIdTrxIdMapIndex.get(regContext)
    if (! map) { return }
    return map.get(dbId)?.at(-1)
  }

  /**
   * Append new trxId to dbIdTrxIdMapIndex,
   * - If exists at last, skip append
   * - If exists in other position, throw Error
   */
  protected setActiveTrxId(regContext: RegisterTrxContext, dbId: string, trxId: symbol): void {
    let map = this.dbIdTrxIdMapIndex.get(regContext)
    if (! map) {
      map = new Map()
      this.dbIdTrxIdMapIndex.set(regContext, map)
    }

    let arr = map.get(dbId)
    if (! arr) {
      arr = []
      map.set(dbId, arr)
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
        otel: this.otel,
        span: querySpanInfo.span,
        attr,
      })
    }
  }

  protected getPropagationType(regContext: RegisterTrxContext, key: CallerKey): PropagationType | undefined {
    const options = this.getPropagationOptions(regContext, key)
    return options?.type
  }

  getPropagationOptionsCount(regContext: RegisterTrxContext): number {
    const map = this.callerKeyPropagationMapIndex.get(regContext)
    if (! map) { return 0 }
    return map.size
  }

  protected validateCallerKeyUnique(
    regContext: RegisterTrxContext,
    key: CallerKey,
    path: FilePath,
  ): void {

    const ret = this.getFilePathFromCallerKeyFileMapIndex(regContext, key)
    if (! ret) { return }
    assert(ret === path, `callerKey "${key}" must unique in all project, but in files:
      - ${path}
      - ${ret}
      Should use different className or funcName`)
  }

  protected getTrxArrayByEntryKey(regContext: RegisterTrxContext, key: CallerKey): KmoreTransaction[] | undefined {
    const map = this.entryCallerKeyTrxMapIndex.get(regContext)
    if (! map) { return }
    return map.get(key)
  }

  protected updateEntryCallerKeyTrxMap(regContext: RegisterTrxContext, key: CallerKey, trx: KmoreTransaction): void {
    let map = this.entryCallerKeyTrxMapIndex.get(regContext)
    if (! map) {
      map = new Map()
      this.entryCallerKeyTrxMapIndex.set(regContext, map)
    }

    let arr = this.getTrxArrayByEntryKey(regContext, key)
    if (! arr) {
      arr = []
      map.set(key, arr)
    }
    arr.push(trx)
  }


  protected updateCallerTreeMap(
    regContext: RegisterTrxContext,
    entryKey: CallerKey,
    value: CallerKey | undefined,
  ): void {

    assert(entryKey, 'entryKey is undefined')

    let callerKeys = this.getCallerKeyArray(regContext, entryKey)
    if (! callerKeys) {
      callerKeys = [entryKey]
      this.setCallerKeyArray(regContext, entryKey, callerKeys)
    }

    if (callerKeys.length > 1024) {
      throw new Error(`callerTreeMap entryKey "${entryKey}" length > 1024, maybe circular reference`)
    }
    value && callerKeys.push(value)
  }

  protected updateCallerTreeMapWithExistsKey(regContext: RegisterTrxContext, entryKey: CallerKey): void {
    assert(entryKey, 'entryKey is undefined')
    const map = this.getCallerTreeMap(regContext)
    if (! map) {
      throw new Error('callerTreeMapIndex not exists for regContext ')
    }

    const arr = map.get(entryKey)
    if (! arr) {
      throw new Error(`entryKey "${entryKey}" not exists in callerTreeMap, but should exists for multiple entry`)
    }
    else if (! arr.includes(entryKey)) {
      throw new Error(`entryKey "${entryKey}" not in callerTreeMap, but should exists for multiple entry`)
    }
    arr.push(entryKey)
  }

  protected delLastCallerKeyFromCallerTreeMap(
    regContext: RegisterTrxContext,
    entryKey: CallerKey,
    key: CallerKey,
  ): void {

    const map = this.callerTreeMapIndex.get(regContext)
    if (! map) {
      throw new Error('callerTreeMapIndex not exists for regContext ')
    }

    const arr = map.get(entryKey)
    if (! arr?.length) { return }
    const pos = arr.lastIndexOf(key)
    if (pos === -1) { return }
    arr.splice(pos, 1)
  }


  protected removeTrxIdFromDbIdMap(regContext: RegisterTrxContext, dbId: string, trxId: symbol): void {
    const map = this.dbIdTrxIdMapIndex.get(regContext)
    if (! map) { return }

    const trxIds = map.get(dbId)
    if (! trxIds) { return }

    const index = trxIds.indexOf(trxId)
    if (index === -1) { return }
    trxIds.splice(index, 1)
  }

  /**
   * If key is not the last one, throw error
   */
  protected removeLastKeyFromCallerTreeArray(regContext: RegisterTrxContext, key: CallerKey): void {
    const map = this.callerTreeMapIndex.get(regContext)
    if (! map) { return }

    for (const [tkey, arr] of map.entries()) {
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

  protected cleanAfterTrx(regContext: RegisterTrxContext, callerKey: CallerKey): void {
    const map = this.entryCallerKeyTrxMapIndex.get(regContext)
    if (map) {
      map.delete(callerKey)
    }
    this.delPropagationOptions(regContext, callerKey)
  }

  protected getCallerTreeMap(regContext: RegisterTrxContext): CallerTreeMap | undefined {
    return this.callerTreeMapIndex.get(regContext)
  }

  protected getCallerKeyArray(regContext: RegisterTrxContext, callerKey: CallerKey): CallerKeyArray | undefined {
    const map = this.getCallerTreeMap(regContext)
    if (! map) { return }
    return map.get(callerKey)
  }

  protected setCallerKeyArray(
    regContext: RegisterTrxContext,
    callerKey: CallerKey,
    keys: CallerKeyArray,
  ): void {

    assert(Array.isArray(keys), 'keys must be array')

    let map = this.getCallerTreeMap(regContext)
    if (! map) {
      map = new Map()
      this.callerTreeMapIndex.set(regContext, map)
    }
    map.set(callerKey, keys)
  }

  protected getErrorMsg(regContext: RegisterTrxContext): string | undefined {
    const str = this.errorMsgMapIndex.get(regContext)
    return str
  }

  protected setErrorMsg(regContext: RegisterTrxContext, str: string): void {
    this.errorMsgMapIndex.set(regContext, str)
  }

  protected delErrorMsg(regContext: RegisterTrxContext): void {
    this.errorMsgMapIndex.delete(regContext)
  }

}

