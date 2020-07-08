import { readFileLineRx, pathResolve } from '@waiting/shared-core'
import { from as ofrom, of, Observable, iif, concat } from 'rxjs'
import {
  map, filter, mergeMap, catchError, take, reduce,
} from 'rxjs/operators'
import { walk, EntryType } from 'rxwalker'
import * as sourceMapSupport from 'source-map-support'

import { genAliasColumns } from './alias-cols-util'
import {
  defaultPropDescriptor,
  reservedTbListKeys,
  initBuildSrcOpts,
  globalCallerFuncNameSet,
  defaultCreateScopedColumnName,
} from './config'
import {
  BuildSrcOpts,
  CallerInfo,
  CallerFuncName,
  CallerFuncNameSet,
  Tables,
  DbCols,
  FilePath,
  LoadVarFromFileOpts,
  Options,
  DbTagMap,
  DbColsTagMap,
  DbModel,
  DbDict,
  DbDictBase,
  KmorePropKeys,
} from './model'
import { genDbScopedCols } from './scoped-cols-util'



/** Allow empty Object */
export function validateParamTables(tbs: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (tbs === null) {
    throw new TypeError('Parameter tables of DbFacrory() invalid. Values is null.')
  }
  if (typeof tbs === 'symbol') {
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

export function validateTbName(tb: unknown): void {
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


export function validateDuplicateProp(
  tbs: Record<string, unknown>,
  key: string,
): void {

  if (typeof key === 'string' && typeof tbs[key] !== 'undefined') {
    throw Error(`Object has duplicate key: "${key}" to assign`)
  }
}

export function getCallerStack(callerDistance: number): CallerInfo {
  const depth = callerDistance + 2
  const caller = getStack(depth)
  return caller
}

/**
 * @see https://stackoverflow.com/a/13227808
 */
export function getStack(depth = 0): CallerInfo {
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
    // @ts-expect-error
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
  const line = arr.pop() // one StackFram, but may all stacks sometime
  if (! line) {
    throw new Error('Retrieve stack of caller failed, line empty.')
  }
  const path = line.slice(line.indexOf('(') + 1, -1)
  if (! path) {
    throw new Error('Retrieve stack of caller failed')
  }

  const matched = /^(.+):(\d+):(\d+)$/u.exec(path)
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
  return !! path.endsWith('.ts')
}


/** Build DbTables from TableListTagMap */
export function buildDbParam<T extends DbModel>(tagMap: DbTagMap): Tables<T> {
  const ret = createNullObject() as Tables<T>

  if (tagMap.size) {
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

/** Build DbTableCols from TableColListTagMap */
export function buildDbColsParam<T extends DbModel>(tagMap: DbColsTagMap): DbCols<T> {
  const ret = createNullObject() as DbCols<T>

  if (tagMap.size) {
    tagMap.forEach((colListTagMap, tb) => {
      const cols = createNullObject()

      colListTagMap.forEach((_tags, col) => {
        Object.defineProperty(cols, col, {
          ...defaultPropDescriptor,
          value: col,
        })
      })

      Object.defineProperty(ret, tb, {
        ...defaultPropDescriptor,
        value: cols,
      })
    })
  }
  else {
    throw new TypeError('Value of tagMap invalid.')
  }

  return ret
}

/** Build DbTableScopedCols from TableColListTagMap */
// export function buildTbScopedColListParam<T extends DbModel>(
//   tagMap: TbColListTagMap,
//   tables: DbTables<T>,
// ): DbTableScopedCols<T> {

//   const ret = createNullObject()
//   if (! tables || ! Object.keys(tables).length) {
//     return ret
//   }

//   if (tagMap && tagMap.size) {
//     tagMap.forEach((colListTagMap, tbAlias) => {
//       const tb = tbAlias as keyof DbTables<T>
//       if (typeof tables[tb] !== 'string') {
//         return
//       }
//       const tbName = tables[tb]
//       const cols = createNullObject()

//       colListTagMap.forEach((_tags, colAlias) => {
//         Object.defineProperty(cols, colAlias, {
//           ...defaultPropDescriptor,
//           value: `${tbName}.${colAlias}`,
//         })
//       })

//       Object.defineProperty(ret, tbAlias, {
//         ...defaultPropDescriptor,
//         value: cols,
//       })
//     })
//   }
//   else {
//     throw new TypeError('Value of tagMap invalid.')
//   }

//   return ret
// }

export function isCallerNameMatched(
  name: string,
  matchFuncNameSet: CallerFuncNameSet,
): boolean {

  if (! name) {
    return false
  }
  else if (matchFuncNameSet.has(name)) {
    return true
  }
  // else if (typeof matchFuncNameSet === 'string' && matchFuncNameSet === name) {
  //   return true
  // }
  // else if (Array.isArray(matchFuncNameSet) && matchFuncNameSet.includes(name)) {
  //   return true
  // }
  else {
    return false
  }
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createNullObject(): any {
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

  const varName = `${exportVarPrefix}${line}_${column}`
  return varName
}

/**
 * Generate generics name of DbModel
 */
export function genDbName(
  dbName: string,
  exportVarSuffix: Options['DictTypeSuffix'],
): string {

  const varName = `${dbName}${exportVarSuffix}`
  const fc = varName.slice(0, 1).toLowerCase()
  const fend = varName.slice(1)
  const ret = fc + fend
  return ret
}


export function reWriteLoadingPath(
  path: FilePath,
  rules: Options['forceLoadDbDictJsPathReplaceRules'],
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

/**
 * Load dbDictBase var from a js file
 */
export function loadDbDictVarFromFile(loadOpts: LoadVarFromFileOpts): DbDict {
  const { path, caller, options } = loadOpts

  const dbDictVarName = genVarName(options.exportVarPrefix, caller.line, caller.column)
  const mods = loadFile(path)

  if (! mods) {
    throw new TypeError(`Loaded mods empty, path: "${path}"`)
  }
  else if (typeof mods[dbDictVarName] === 'object') {
    return mods[dbDictVarName]
  }
  throw new TypeError(`Loaded mods[${dbDictVarName}] not object, path: "${path}"`)
}

export function loadFile(path: string): Record<string, DbDict> {
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
  const { path: basePath, excludePathKeys, maxScanLines } = opts
  const maxDepth = 99
  const concurrent = opts.concurrent && opts.concurrent > 0
    ? opts.concurrent
    : 5
  const matchFuncNameSet = new Set(globalCallerFuncNameSet)

  const dir$: Observable<string> = iif(
    () => {
      if (typeof basePath === 'string') {
        return true
      }
      else if (Array.isArray(basePath)) {
        return false
      }
      else {
        throw new TypeError('Value of baseDir invalid, should be String or Array.')
      }
    },
    of(basePath as string),
    ofrom(basePath as string[]),
  )

  const path$ = dir$.pipe(
    mergeMap(path => walk(path, { maxDepth }), concurrent),
    filter((ev) => {
      const { path } = ev
      return path ? ! ifPathContainsKey(path, excludePathKeys) : false
    }),
    filter(ev => ev.type === EntryType.file
      && ev.path.endsWith('.ts')
      && ! ev.path.endsWith('.d.ts')),
    map(ev => ev.path),
    mergeMap((path) => {
      const flag$ = ifFileContentContainsCallerFuncNames(matchFuncNameSet, maxScanLines, path)
      return flag$.pipe(
        map((contains) => {
          return contains ? path : ''
        }),
      )
    }, concurrent),
    filter(path => path.length > 0),
  )

  const ret$ = path$.pipe(
    reduce((acc: string[], val: string) => {
      const path = pathResolve(val)
      if (! acc.includes(path)) {
        acc.push(path)
      }
      return acc
    }, []),
    mergeMap(paths => ofrom(paths)),
  )

  return ret$
}

function ifPathContainsKey(path: FilePath, keys: string | string[]): boolean {
  if (! path) {
    return false
  }

  if (typeof keys === 'string' && keys) {
    return path.includes(keys)
  }
  else if (Array.isArray(keys)) {
    for (const key of keys) {
      if (key && path.includes(key)) {
        return true
      }
    }
  }

  return false
}

function ifFileContentContainsCallerFuncNames(
  matchFuncNameSet: CallerFuncNameSet,
  maxLines: number,
  path: FilePath,
): Observable<boolean> {

  const line$ = readFileLineRx(path)
  const scan$ = line$.pipe(
    take(maxLines >= 0 ? maxLines : 128),
    map((content) => {
      return hasContainsCallerFuncNames(matchFuncNameSet, content)
    }),
    filter(exists => !! exists),
    catchError(() => of(false)),
  )

  const notExists$ = of(false)
  const ret$ = concat(scan$, notExists$).pipe(
    take(1),
    // tap((exists) => {
    //   // eslint-disable-next-line no-console
    //   console.info(exists)
    // }),
  )

  return ret$
}

export function hasContainsCallerFuncNames(
  matchFuncNameSet: CallerFuncNameSet,
  content: string,
): boolean {

  if (content) {
    for (const key of matchFuncNameSet.keys()) {
      if (content.includes(key)) {
        return true
      }
    }
  }
  return false
}


export function parseCallerFuncNames(
  callerFuncNameSet: CallerFuncNameSet,
  names: CallerFuncName | CallerFuncName[],
): CallerFuncNameSet {

  const st = new Set(callerFuncNameSet)

  if (! names) {
    return st
  }
  else if (typeof names === 'string') {
    st.add(names)
  }
  else if (Array.isArray(names) && names.length) {
    names.forEach(name => st.add(name))
  }
  else {
    throw new TypeError('Value of param invalid.')
  }

  return st
}

/**
 * Generate DbDict from generics type T,
 * Loading compiled js file if prod env.
 * Param columnNameCreationFn ignored if dbDictBase is type DbDict<D>.
 */
export function genDbDictFromBase<D extends DbModel>(
  dbDictBase: DbDictBase<D> | DbDict<D>,
  /** false will use original col name w/o table name prefix */
  columnNameCreationFn: Options['columnNameCreationFn'] = defaultCreateScopedColumnName,
): DbDict<D> {

  const ret = { ...dbDictBase } as DbDict<D>

  if (! hasExtColumns(dbDictBase, KmorePropKeys.scopedColumns)) {
    ret.scopedColumns = genDbScopedCols(dbDictBase, columnNameCreationFn)
  }

  if (! hasExtColumns(dbDictBase, KmorePropKeys.aliasColumns)) {
    ret.aliasColumns = genAliasColumns(ret.scopedColumns)
  }

  return ret
}

export function hasExtColumns<D extends DbModel>(
  dict: DbDictBase<D> | DbDict<D>,
  key: KmorePropKeys,
): dict is DbDict<D> {

  if (! Object.prototype.hasOwnProperty.call(dict, KmorePropKeys.tables)) {
    throw new TypeError('Value of parameter dbDictBase of has no tables property')
  }
  else if (! Object.prototype.hasOwnProperty.call(dict, KmorePropKeys.columns)) {
    throw new TypeError('Value of parameter dbDictBase of has no columns property')
  }
  return !! Object.prototype.hasOwnProperty.call(dict, key)
}


/**
 * tb_user => tbUser,
 * tb-user => tbUser
 */
export function snakeToCamel(string: string): string {
  return string.replace(/([-_][a-z])/uig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  })
}

/**
 * tb_user.uid => tbUserUid,
 * tb-user.uid => tbUserUid
 */
export function scopedSnakeToCamel(input: string): string {
  return snakeToCamel(input.replace(/\./ug, '_'))
}

