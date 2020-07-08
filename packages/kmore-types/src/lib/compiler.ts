// eslint-disable-next-line import/no-extraneous-dependencies
import { accessSync, constants } from 'fs'

import {
  cacheMap as cacheMapTop,
  initGenDbDictFromTypeOpts,
  globalCallerFuncNameSet,
  initOptions,
  defaultCreateScopedColumnName,
} from './config'
import {
  RetrieveInfoFromTypeOpts,
  CallerInfo,
  GenDbDictFromTypeOpts,
  DbModel,
  DbDictBase,
  TagsMapArr,
  LocalTypeItem,
  Options,
  BuildSrcOpts,
  DbDict,
} from './model'
import {
  genInfoFromNode,
  matchSourceFileWithFilePath,
  walkNodeWithPosition,
} from './ts-util'
import {
  buildDbParam,
  buildDbColsParam,
  getCallerStack,
  isTsFile,
  reWriteLoadingPath,
  loadDbDictVarFromFile,
  genDbDictFromBase,
} from './util'


/**
 * Generate DbDict from generics type T
 * Loading compiled js file if prod env
 */
export function genDbDictFromType<D extends DbModel>(
  options?: Partial<Options>,
): DbDict<D> {

  const opts = options
    ? { ...initOptions, ...options }
    : { ...initOptions }

  if (process.env.NODE_ENV === 'production') {
    opts.forceLoadDbDictJs = true
    if (opts.forceLoadDbDictJsPathReplaceRules === null) {
      opts.forceLoadDbDictJsPathReplaceRules = [ [/\/src\//u, '/dist/'] ]
    }
  }
  const caller = getCallerStack(opts.callerDistance)
  const kdd = loadDbDictParamFromCallerInfo<D>(opts, caller, opts.columnNameCreationFn)
  return kdd
}

export function loadDbDictParamFromCallerInfo<D extends DbModel>(
  options: Options,
  caller: CallerInfo,
  /** false will use original col name w/o table name prefix */
  columnNameCreationFn: Options['columnNameCreationFn'] = defaultCreateScopedColumnName,
): DbDict<D> {

  if (! options.forceLoadDbDictJs && isTsFile(caller.path)) {
    return loadDbDictFromTsTypeFile<D>(options.callerDistance + 3, columnNameCreationFn)
  }
  else { // run in js or debug in ts
    return loadDbDictFromJsBuiltFile(options, caller) as DbDict<D>
  }
}


function loadDbDictFromTsTypeFile<D extends DbModel>(
  callerDistance: BuildSrcOpts['callerDistance'],
  /** false will use original col name w/o table name prefix */
  columnNameCreationFn: Options['columnNameCreationFn'] = defaultCreateScopedColumnName,
): DbDict<D> {

  const base = genDbDictBaseFromType<D>({ callerDistance })
  const ret = genDbDictFromBase(base, columnNameCreationFn)
  return ret
}

function loadDbDictFromJsBuiltFile(
  options: Options,
  caller: CallerInfo,
): DbDict {

  const { outputFileNameSuffix, forceLoadDbDictJsPathReplaceRules } = options

  let path = `${caller.path.slice(0, -3)}.${outputFileNameSuffix}.js`
  path = reWriteLoadingPath(path, forceLoadDbDictJsPathReplaceRules)

  accessSync(path, constants.R_OK)

  const ret = loadDbDictVarFromFile({ path, caller, options })
  return ret
}

/**
 * Generate DbDictBase from generics type T
 */
function genDbDictBaseFromType<T extends DbModel>(
  options?: Partial<GenDbDictFromTypeOpts>,
): DbDictBase<T> {

  const opts: GenDbDictFromTypeOpts = options
    ? { ...initGenDbDictFromTypeOpts, ...options }
    : { ...initGenDbDictFromTypeOpts }

  const depth = typeof opts.callerDistance === 'number' && opts.callerDistance > 0
    ? opts.callerDistance
    : 0
  const caller = getCallerStack(depth)

  if (isTsFile(caller.path)) {
    return genDbDictBaseFromCaller<T>(caller, opts)
  }
  else {
    throw TypeError('Not .ts file')
  }
}


function genDbDictBaseFromCaller<T extends DbModel>(
  caller: CallerInfo,
  options: GenDbDictFromTypeOpts,
): DbDictBase<T> {

  const opts: RetrieveInfoFromTypeOpts = {
    // callerDistance: initOptions.callerDistance,
    // callerFuncNames: initOptions.callerFuncNames,
    ...options,
    caller,
    cacheMap: cacheMapTop,
  }
  // "/kmore-mono/packages/kmore-types/test/test.config.ts:13:23"
  const callerId = `${caller.path}:${caller.line}:${caller.column}`
  const localTypeId = opts.cacheMap.callerIdToLocalTypeIdMap.get(callerId)

  if (localTypeId) { // from cache
    const tagsMapArr: TagsMapArr | undefined = opts.cacheMap.localTypeMap.get(localTypeId)
    if (tagsMapArr) {
      return buildDbDictBaseFromTagsMapArr(tagsMapArr)
    }
    else {
      throw new Error(`cacheMap.localTypeMap not contains key: "${localTypeId}".`)
    }
  }
  else {
    const localTypeItem: LocalTypeItem | void = retrieveLocalTypeItemFromType(opts)

    if (! localTypeItem) {
      throw new Error(`retrieveLocalTypeMapFromType() return empty with key: "${localTypeId ? localTypeId : 'N/A'}".`)
    }

    // id is localTypeId
    // map maybe empty, so try from cache
    const { localTypeId: id, tagsMapArr } = localTypeItem

    opts.cacheMap.callerIdToLocalTypeIdMap.set(callerId, id)

    if (tagsMapArr && tagsMapArr[0].size) {
      opts.cacheMap.localTypeMap.set(id, tagsMapArr)
      return buildDbDictBaseFromTagsMapArr(tagsMapArr)
    }
    else { // retrieved only localTypeId, then try from cache
      const tagsMapArr2 = opts.cacheMap.localTypeMap.get(id)
      if (! tagsMapArr2) {
        throw new Error(`cacheMap.localTypeMap not contains key: "${id}" or value empty.`)
      }
      else if (! tagsMapArr2[0].size) {
        throw new Error(`cacheMap.localTypeMap key: "${id}" value empty.`)
      }
      return buildDbDictBaseFromTagsMapArr(tagsMapArr2)
    }
  }
}

function buildDbDictBaseFromTagsMapArr<T extends DbModel>(
  tagsMapArr: TagsMapArr,
): DbDictBase<T> {

  const [dbTagMap, dbColsTagMap] = tagsMapArr
  const ret: DbDictBase<T> = {
    tables: buildDbParam<T>(dbTagMap),
    columns: buildDbColsParam<T>(dbColsTagMap),
  }
  return ret
}

export function retrieveLocalTypeItemFromType(
  options: RetrieveInfoFromTypeOpts,
): LocalTypeItem | undefined {

  const { caller } = options
  const { checker, sourceFile } = matchSourceFileWithFilePath(caller.path)

  /* istanbul ignore else */
  if (! sourceFile) {
    // throw new Error(`Can not retrieve generics type info from file: "${caller.path}"`)
    return
  }

  // genDbDictFromType<Db>()
  const node = walkNodeWithPosition({
    sourceFile,
    matchLine: caller.line,
    matchColumn: caller.column,
    matchFuncNameSet: globalCallerFuncNameSet,
  })


  /* istanbul ignore else */
  if (node) {

    const nodeInfo = genInfoFromNode({
      checker,
      node,
      path: caller.path,
      sourceFile,
    })
    if (nodeInfo) {
      const { localTypeId, dbTagMap, dbColsTagMap } = nodeInfo

      if (dbTagMap.size) {
        // localTypeId: "/kmore-mono/packages/kmore-types/test/test.config.ts:typeid-Db"
        return {
          localTypeId,
          tagsMapArr: [dbTagMap, dbColsTagMap],
        }
      }
      else {
        return {
          localTypeId, // empty tagsMapArr. will try from resolved cache data later.
        }
      }
    }
  }
}


// function transformerFactory<T extends ts.Node>(ctx: ts.TransformationContext): ts.Transformer<T> {
//   const transformer = (rootNode: T) => {
//     const visit: ts.Visitor = (nodeParam: ts.Node): ts.Node => {
//       const node = ts.visitEachChild(nodeParam, visit, ctx)
//       return node
//     }
//     return ts.visitNode(rootNode, visit)

//   }
//   return transformer
// }

