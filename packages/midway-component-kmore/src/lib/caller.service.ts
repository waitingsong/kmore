import assert from 'node:assert'

import { ApplicationContext, IMidwayContainer, Singleton } from '@midwayjs/core'
import type { ScopeType } from '@mwcp/share'
import { CallerInfo, getCallerStack } from '@waiting/shared-core'

import {
  genCallerKey,
  getSimpleCallers,
} from './propagation/trx-status.helper.js'
import {
  CallerKey,
  CallerKeyFileMapIndex,
  CallerTreeMapIndex,
  DbSourceName,
  FilePath,
} from './propagation/trx-status.types.js'


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

@Singleton()
export class CallerService {

  @ApplicationContext() readonly applicationContext: IMidwayContainer

  protected readonly callerKeyFileMapIndex: CallerKeyFileMapIndex = new Map()
  protected readonly callerTreeMapIndex: CallerTreeMapIndex = new Map()

  deleteCallerKeyFileMapIndex(scope: ScopeType): void {
    this.callerKeyFileMapIndex.delete(scope)
  }

  deleteCallerTreeMapIndex(scope: ScopeType): void {
    this.callerTreeMapIndex.delete(scope)
  }

  // #region Call stack

  retrieveCallerInfo(distance = 0, retrievePosition = false): CallerInfo {
    const callerInfo = getCallerStack(distance + 1, retrievePosition)
    return callerInfo
  }

  retrieveTopCallerKeyFromCallStack(limit = 128): CallerKey[] {
    const ret: CallerKey[] = []
    const callers = getSimpleCallers(limit)
    if (! callers.length) {
      return ret
    }

    for (let i = callers.length - 1; i > 1; i -= 1) {
      const caller = callers[i]
      if (! caller) { continue }
      if (! caller.className || ! caller.funcName) { continue }
      if (caller.funcName.includes('Clz.<')) { continue }
      if (caller.path.startsWith('node:internal')) { continue }
      if (skipMethodNameSet.has(caller.methodName)) { continue }

      const key = genCallerKey(caller.className, caller.funcName)
      ret.push(key)
    }
    return ret
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

  retrieveUniqueTopCallerKey(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): CallerKey | undefined {
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

  validateCallerKeyUnique(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey, path: FilePath): void {
    const ret = this.getFilepathFromCallerKeyFileMapIndex(dbSourceName, scope, key)
    if (! ret) { return }
    assert(ret === path, `callerKey "${key}" must unique in all project, but in files:
      - ${path}
      - ${ret}
      Should use different className or funcName`)
  }


  // #region callerTreeMapIndex

  updateCallerTreeMap(dbSourceName: DbSourceName, scope: ScopeType, entryKey: CallerKey, value: CallerKey | undefined): void {
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

  protected getCallerTreeArray(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): CallerKey[] | undefined {
    const sourceNameMap = this.callerTreeMapIndex.get(scope)
    if (! sourceNameMap?.size) { return }

    const dbSourceCallerTreeMap = sourceNameMap.get(dbSourceName)
    if (! dbSourceCallerTreeMap?.size) { return }

    return dbSourceCallerTreeMap.get(key)
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
  removeLastKeyFromCallerTreeArray(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): void {
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

  setFilepathToCallerKeyFileMapIndex(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey, path: FilePath): void {
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

  delFilepathFromCallerKeyFileMapIndex(dbSourceName: DbSourceName, scope: ScopeType, key: CallerKey): void {
    this.callerKeyFileMapIndex.get(scope)?.get(dbSourceName)?.delete(key)
  }

}

