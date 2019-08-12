import * as sourceMapSupport from 'source-map-support'
import { walk, EntryType } from 'rxwalker'
import { from as ofrom, defer, of, Observable, iif } from 'rxjs'
import { map, filter, mergeMap, catchError, mapTo } from 'rxjs/operators'
import { readFileAsync } from '@waiting/shared-core'

import { defaultPropDescriptor, reservedTbListKeys, initBuildSrcOpts } from './config'
import {
  BuildSrcOpts,
  CallerInfo,
  CallerFuncName,
  DbTables,
  FilePath,
  Options,
  TbListTagMap,
  TTableListModel,
} from './model'


export function validateParamTables(tbs: unknown): void {
  if (tbs === null) {
    throw new TypeError('Parameter tables of DbFacrory() invalid. Values is null.')
  }
  else if (typeof tbs === 'symbol') {
    throw new TypeError('Parameter tables of DbFacrory() invalid. Values is symbol.')
  }
  else if (Array.isArray(tbs)) {
    throw new TypeError('Parameter tables of DbFacrory() invalid, value is Array.')
    // tbs.forEach((tb) => {
    //   if (typeof tb !== 'string') {
    //     throw new TypeError(`TableName in parameter of DbFacrory() invalid: "${tb}"`)
    //   }
    //   validateTbName(tb)
    // })
  }
  if (typeof tbs === 'object') {
    if (! tbs || ! Object.keys(tbs).length) {
      return
    }

    Object.entries(tbs).forEach((item) => {
      const [aliasOri, tbName] = item

      validateTbName(aliasOri)
      validateTbName(tbName)

      if (typeof aliasOri !== 'string') {
        throw new TypeError('TableModel name in parameter of DbFacrory() invalid.' + item.toString())
      }
      else if (! aliasOri.trim()) {
        throw new RangeError('Value of Parameter alias/tbl of DbFacrory() invalid.')
      }
    })
  }
  else {
    throw new TypeError('Parameter tables of DbFacrory() invalid.')
  }
}

export function validateTbName(tb: string): void {
  if (typeof tb !== 'string') {
    throw new TypeError('TableName in parameter of DbFacrory() empty.')
  }

  const tbName = tb.trim()

  if (! tbName) {
    throw new RangeError('Value of Parameter alias/tbl of DbFacrory() invalid.')
  }
  else if (reservedTbListKeys.includes(tbName)) {
    throw new TypeError(`tableName "${tbName}" of param tables is in reservedTbListKeys`)
  }
}

// export function parseTbList<T extends TTableListModel>(tbs: TbListParam): DbTables<T> {
//   if (! tbs) {
//     return {} as DbTables<never>
//   }
//   // else if (Array.isArray(tbs)) {
//   //   return parseTbListArray<T>(tbs)
//   // }
//   else if (typeof tbs === 'object') {
//     return parseTbListObject<T>(tbs)
//   }
//   else {
//     throw TypeError('TbListParam invalid')
//   }
// }
// function parseTbListObject<TL extends TTableListModel>(tbs: object): DbTables<TL> {
//   const ret = createNullObject()

//   if (! tbs) {
//     return ret
//   }

//   Object.entries(tbs).forEach((item) => {
//     const [tbName, alias] = item

//     validateDuplicateProp(ret, tbName)

//     // {tbName: alias}
//     Object.defineProperty(ret, tbName, {
//       ...defaultPropDescriptor,
//       value: alias,
//     })
//   })

//   return ret
// }

// function parseTbListArray<T extends object>(tbs: readonly string[]): DbTables<T> {
//   const ret = Object.create(null)

//   tbs.forEach((tb) => {
//     const tbName = tb.toString()

//     validateDuplicateProp(ret, tbName)

//     // {tbName: tbName}
//     Object.defineProperty(ret, tbName, {
//       ...defaultPropDescriptor,
//       value: tbName,
//     })
//   })

//   return ret
// }


export function validateDuplicateProp(
  tbs: object,
  key: string,
): void {

  // @ts-ignore
  if (tbs && typeof key === 'string' && typeof tbs[key] !== 'undefined') {
    throw Error(`Object has duplicate key: "${key}" to assign`)
  }
}


/**
 * @see https://stackoverflow.com/a/13227808
 */
export function getCallerStack(depth: number = 1): CallerInfo {
  // Save original Error.prepareStackTrace
  const origPrepareStackTrace = Error.prepareStackTrace

  /* istanbul ignore else */
  if (! origPrepareStackTrace) {
    sourceMapSupport.install()
    if (! Error.prepareStackTrace) {
      throw new Error('Error.prepareStackTrace not defined')
    }
  }
  // void else in debug hooked by source-map-support already

  const patchedPrepareStackTrace = Error.prepareStackTrace
  // Override with function that just returns `stack`
  Error.prepareStackTrace = function(_err, stack) {
    const target = stack[depth + 1]
    // @ts-ignore
    return patchedPrepareStackTrace(_err, [target])
  }

  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = depth + 2

  const err = new Error()
  const { stack } = err

  // Restore original `Error.prepareStackTrace`
  Error.prepareStackTrace = origPrepareStackTrace
  Error.stackTraceLimit = limit

  if (! stack) {
    throw new Error('stack EMPTY!')
  }

  const arr = stack.split('\n')
  const line = arr.pop() // may one StackFram or all
  if (! line) {
    throw new Error('Retrieve stack of caller failed, line empty.')
  }
  const path = line.slice(line.indexOf('(') + 1, -1)
  if (! path) {
    throw new Error('Retrieve stack of caller failed')
  }

  const matched = path.match(/^(.+):(\d+):(\d+)$/u)
  if (! matched || matched.length !== 4) {
    throw new Error('Retrieve stack of caller failed. ' + (matched ? JSON.stringify(matched) : ''))
  }

  const caller: CallerInfo = {
    path: matched[1].replace(/\\/gu, '/'),
    line: +matched[2],
    column: +matched[3],
  }

  return caller
}


export function isTsFile(path: string): boolean {
  return !! (path && path.endsWith('.ts'))
}


/** Build DbTables from TableListTagMap */
export function buildTbListParam<T extends TTableListModel>(tagMap: TbListTagMap): DbTables<T> {
  const ret = createNullObject()

  if (tagMap && tagMap.size) {
    tagMap.forEach((_tags, key) => {
      Object.defineProperty(ret, key, {
        ...defaultPropDescriptor,
        value: key,
      })
    })
  }
  else {
    throw new TypeError('Value of tagMap invalid.')
  }

  return ret
}

export function isCallerNameMatched(
  name: string,
  matchFuncName: CallerFuncName | CallerFuncName[],
): boolean {

  if (! name) {
    return false
  }
  else if (typeof matchFuncName === 'string' && matchFuncName === name) {
    return true
  }
  else if (Array.isArray(matchFuncName) && matchFuncName.includes(name)) {
    return true
  }
  else {
    return false
  }
}


export function createNullObject() {
  return Object.create(null)
}


export function genTbListTsFilePath(
  path: string,
  outputFileNameSuffix: Options['outputFileNameSuffix'],
): FilePath {

  const ret = path.slice(0, -3) + `.${outputFileNameSuffix}.ts`
  return ret.replace(/\\/gu, '/')
}

export function genVarName(
  exportVarPrefix: Options['exportVarPrefix'],
  line: number,
  column: number,
): string {

  const varName = `${exportVarPrefix}_${line}_${column}`
  return varName
}


export function reWriteLoadingPath(
  path: FilePath,
  rules: Options['forceLoadTbListJsPathReplaceRules'],
): FilePath {

  let ret = path
  /* istanbul ignore else */
  if (rules && rules.length) {
    rules.forEach(([regx, str]) => {
      ret = ret.replace(regx, str)
    })
  }

  return ret
}


export function loadVarFromFile<T extends TTableListModel>(
  path: string,
  caller: CallerInfo,
  options: Options,
): DbTables<T> {

  const varName = genVarName(options.exportVarPrefix, caller.line, caller.column)
  const mods = loadFile(path)

  if (mods && typeof mods[varName] === 'object') {
    return mods[varName] as DbTables<T>
  }
  throw new TypeError(`Load tables failed, path: "${path}"`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadFile(path: string): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const mods = require(path)
  return mods
}


/**
 * Scan and emit .ts type files containing keywords of Options['callerFuncNames']
 */
export function walkDirForCallerFuncTsFiles(options: BuildSrcOpts): Observable<FilePath> {
  const opts: Required<BuildSrcOpts> = {
    ...initBuildSrcOpts,
    ...options,
  }
  const { path: baseDir } = opts
  const maxDepth = 99
  const concurrent = opts.concurrent && opts.concurrent > 0
    ? opts.concurrent
    : 5

  const dir$: Observable<string> = iif(
    () => {
      if (typeof baseDir === 'string') {
        return true
      }
      else if (Array.isArray(baseDir)) {
        return false
      }
      else {
        throw new TypeError('Value of baseDir invalid, should be String or Array.')
      }
    },
    of(baseDir as string),
    ofrom(baseDir as string[]),
  )

  const path$ = dir$.pipe(
    mergeMap(path => walk(path, { maxDepth }), concurrent),
    filter(ev => ev.type === EntryType.file
      && ev.path.endsWith('.ts')
      && ! ev.path.endsWith('.d.ts')),
    map(ev => ev.path),
    mergeMap((path) => {
      const flag$ = ifFileContainsCallerFuncNames(path, opts.callerFuncNames)
      return flag$.pipe(
        map((contains) => {
          return contains ? path : ''
        }),
      )
    }, concurrent),
    filter(path => path.length > 0),
  )

  return path$
}

export function ifFileContainsCallerFuncNames(
  path: FilePath,
  callerFuncNames: Options['callerFuncNames'],
): Observable<boolean> {

  const file$ = defer(() => readFileAsync(path))
  const ret$ = file$.pipe(
    map((buf) => {
      const ret = buf.length > 1024 ? buf.slice(0, 1024) : buf
      return ret
    }),
    filter((buf) => {
      const code = buf.toString()
      return isContainsCallerFuncNames(code, callerFuncNames)
    }),
    mapTo(true),
    catchError(() => of(false)),
  )

  return ret$
}

export function isContainsCallerFuncNames(
  content: string,
  callerFuncNames: Options['callerFuncNames'],
): boolean {

  if (! content) {
    return false
  }
  else if (typeof callerFuncNames === 'string') {
    return content.includes(callerFuncNames)
  }
  else {
    for (const name of callerFuncNames) {
      if (content.includes(name)) {
        return true
      }
    }
    return false
  }
}
