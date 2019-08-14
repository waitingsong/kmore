// eslint-disable-next-line import/no-extraneous-dependencies
import * as ts from 'typescript'

import {
  GenGenericsArgMapOpts,
  LocalTypeMap,
  RetrieveInfoFromTypeOpts,
  CallerInfo,
  GenTbListFromTypeOpts,
  DbTables,
  TbListTagMap,
  TTableListModel,
} from './model'
import { buildTbListParam, isTsFile, getCallerStack } from './util'
import {
  genTbListTagMapFromSymbol,
  retrieveGenericsIdentifierFromTypeArguments,
  matchSourceFileWithFilePath,
  walkNodeWithPosition,
} from './ts-util'
import {
  cacheMap as cacheMapTop,
  // initOptions,
  initGenTbListFromTypeOpts,
  globalCallerFuncNameSet,
} from './config'


/**
 * Generate DbTables from generics type T
 */
export function genTbListFromType<T extends TTableListModel>(
  options?: Partial<GenTbListFromTypeOpts>,
): DbTables<T> {

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


export function genTbListFromCaller<T extends TTableListModel>(
  caller: CallerInfo,
  options: GenTbListFromTypeOpts,
): DbTables<T> {

  const opts: RetrieveInfoFromTypeOpts = {
    // callerDistance: initOptions.callerDistance,
    // callerFuncNames: initOptions.callerFuncNames,
    ...options ? options : {},
    caller,
    cacheMap: cacheMapTop,
  }
  const callerId = `${caller.path}:${caller.line}:${caller.column}`
  const localTypeId = opts.cacheMap.callerIdToLocalTypeIdMap.get(callerId)
  let ret = {} as DbTables<T>

  if (localTypeId) {
    const tbListTagMap: TbListTagMap | void = opts.cacheMap.localTypeMap.get(localTypeId)
    if (! tbListTagMap) {
      throw new Error(`cacheMap.localTypeMap not contains key: "${localTypeId}".`)
    }
    else if (! tbListTagMap.size) {
      throw new Error(`cacheMap.localTypeMap key: "${localTypeId}" value empty.`)
    }
    ret = buildTbListParam<T>(tbListTagMap)
  }
  else {
    const localTypeMap: LocalTypeMap = retrieveLocalTypeMapFromType(opts)

    // id is localTypeId
    // map maybe empty
    localTypeMap.forEach((map, id) => {
      opts.cacheMap.callerIdToLocalTypeIdMap.set(callerId, id)

      // map can be empty as cached result
      if (map.size) {
        opts.cacheMap.localTypeMap.set(id, map)
        ret = buildTbListParam<T>(map)
      }
      else {
        const cMap = opts.cacheMap.localTypeMap.get(id)
        if (! cMap) {
          throw new Error(`cacheMap.localTypeMap not contains key: "${id}" or value empty.`)
        }
        else if (! cMap.size) {
          throw new Error(`cacheMap.localTypeMap key: "${id}" value empty.`)
        }
        ret = buildTbListParam<T>(cMap)
      }
    })
  }

  return ret
}


export function retrieveLocalTypeMapFromType(
  options: RetrieveInfoFromTypeOpts,
): LocalTypeMap {

  const { checker, sourceFile } = matchSourceFileWithFilePath(options.caller.path)

  if (sourceFile) {
    const localTypeMap: LocalTypeMap = genGenericsArgMap({
      ...options,
      sourceFile,
      checker,
    })

    /* istanbul ignore else */
    if (localTypeMap.size) {
      return localTypeMap // retrieve succeed
    }
  }

  // throw new Error(`Can not retrieve generics type info from file: "${caller.path}"`)
  return new Map()
}

export function genGenericsArgMap(options: GenGenericsArgMapOpts): LocalTypeMap {
  const retMap: LocalTypeMap = new Map()
  const {
    cacheMap, sourceFile, checker, caller,
  } = options

  const node: ts.CallExpression | void = walkNodeWithPosition({
    sourceFile,
    matchLine: caller.line,
    matchColumn: caller.column,
    matchFuncNameSet: globalCallerFuncNameSet,
  })

  /* istanbul ignore else */
  if (node) {
    const typeName: ts.Identifier | void = retrieveGenericsIdentifierFromTypeArguments(node)

    /* istanbul ignore else */
    if (typeName && typeName.getText()) {
      const gType = checker.getTypeAtLocation(typeName)
      // const symbol = checker.getSymbolAtLocation(typeName)

      /* istanbul ignore else */
      if (gType && gType.symbol) {
        // might be type alias name so we use typdid
        // const genericsArgName: GenericsArgName = typeName.text
        // @ts-ignore
        const typeid: number = typeof gType.id === 'number' ? gType.id : Math.random()
        const localTypeId = `${caller.path}:typeid-${typeid}`

        if (retMap.has(localTypeId)) {
          return retMap
        }
        else if (cacheMap.localTypeMap.has(localTypeId)) {
          retMap.set(localTypeId, new Map()) // empty map
        }
        else {
          const tagMap = genTbListTagMapFromSymbol(gType.symbol)
          tagMap.size && retMap.set(localTypeId, tagMap)
        }
      }
    }
  }

  return retMap
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
