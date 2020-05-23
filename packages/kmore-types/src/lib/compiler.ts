/* eslint-disable @typescript-eslint/prefer-optional-chain */
// eslint-disable-next-line import/no-extraneous-dependencies
import { CallExpression } from 'typescript'

import {
  cacheMap as cacheMapTop,
  initGenTbListFromTypeOpts,
  globalCallerFuncNameSet,
} from './config'
import {
  RetrieveInfoFromTypeOpts,
  CallerInfo,
  GenTbListFromTypeOpts,
  TTables,
  KTablesBase,
  TagsMapArr,
  LocalTypeItem,
  // TbColListMap,
  // TbColListTagMap,
  // TbJointColListTagMap,
  // ColListTagMap,
} from './model'
import {
  genInfoFromNode,
  matchSourceFileWithFilePath,
  walkNodeWithPosition,
} from './ts-util'
import {
  buildTbListParam,
  buildTbColListParam,
  getCallerStack,
  isTsFile,
} from './util'


/**
 * Generate KTables from generics type T
 */
export function genTbListFromType<T extends TTables>(
  options?: Partial<GenTbListFromTypeOpts>,
): KTablesBase<T> {

  const opts: GenTbListFromTypeOpts = options
    ? { ...initGenTbListFromTypeOpts, ...options }
    : { ...initGenTbListFromTypeOpts }

  const depth = typeof opts.callerDistance === 'number' && opts.callerDistance > 0
    ? opts.callerDistance
    : 0
  const caller = getCallerStack(depth)

  if (isTsFile(caller.path)) {
    return genTbListFromCaller<T>(caller, opts)
  }
  else {
    throw TypeError('Not .ts file')
  }
}


export function genTbListFromCaller<T extends TTables>(
  caller: CallerInfo,
  options: GenTbListFromTypeOpts,
): KTablesBase<T> {

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
    if (tagsMapArr && tagsMapArr.length) {
      return buildKTablesBaseFromTagsMapArr(tagsMapArr)
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

    if (tagsMapArr && tagsMapArr[0] && tagsMapArr[0].size) {
      opts.cacheMap.localTypeMap.set(id, tagsMapArr)
      return buildKTablesBaseFromTagsMapArr(tagsMapArr)
    }
    else { // retrieved only localTypeId, then try from cache
      const tagsMapArr2 = opts.cacheMap.localTypeMap.get(id)
      if (! tagsMapArr2) {
        throw new Error(`cacheMap.localTypeMap not contains key: "${id}" or value empty.`)
      }
      else if (! tagsMapArr2[0].size) {
        throw new Error(`cacheMap.localTypeMap key: "${id}" value empty.`)
      }
      return buildKTablesBaseFromTagsMapArr(tagsMapArr2)
    }
  }
}

function buildKTablesBaseFromTagsMapArr<T extends TTables>(
  tagsMapArr: TagsMapArr,
): KTablesBase<T> {

  const [tbListTagMap, tbColListTagMap] = tagsMapArr
  // const jointColumns = genJointColListTagMap(tbColListTagMap)
  const ret: KTablesBase<T> = {
    tables: buildTbListParam<T>(tbListTagMap),
    columns: buildTbColListParam<T>(tbColListTagMap),
  }
  return ret
}

// function genJointColListTagMap(tbColListTagMap: TbColListTagMap): TbJointColListTagMap {
//   const ret: TbJointColListTagMap = new Map()

//   tbColListTagMap.forEach((colListTagMap, tb) => {
//     colListTagMap.forEach((tagInfo[], colAlias) => {

//     })

//   })

//   return ret
// }
export function snakeToCamel(string: string): string {
  return string.replace(/([-_][a-z])/iug, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  })
}

export function retrieveLocalTypeItemFromType(
  options: RetrieveInfoFromTypeOpts,
): LocalTypeItem | void {

  const { caller } = options
  const { checker, sourceFile } = matchSourceFileWithFilePath(caller.path)

  /* istanbul ignore else */
  if (! sourceFile) {
    // throw new Error(`Can not retrieve generics type info from file: "${caller.path}"`)
    return
  }

  const node: CallExpression | void = walkNodeWithPosition({
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
      const { localTypeId, tbTagMap, tbColTagMap } = nodeInfo

      if (tbTagMap.size) {
        // localTypeId: "/kmore-mono/packages/kmore-types/test/test.config.ts:typeid-TbListModel"
        return {
          localTypeId,
          tagsMapArr: [tbTagMap, tbColTagMap],
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

