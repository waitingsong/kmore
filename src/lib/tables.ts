import { accessSync, constants } from 'fs'

import {
  CallerInfo,
  DbTables,
  Options,
  TTableListModel,
} from './model'
import {
  getCallerStack,
  isTsFile,
  reWriteLoadingPath,
  loadVarFromFile,
} from './util'
import { genTbListFromType } from './compiler'


export function loadTbListParamFromCallerInfo<T extends TTableListModel>(
  options: Options,
): DbTables<T> {

  const caller = getCallerStack(2)

  if (! options.forceLoadTbListJs && isTsFile(caller.path)) {
    return loadTbListFromTsTypeFile<T>(options.callerFuncNames)
  }
  else { // run in js or debug in ts
    return loadTbListFromJsBuiltFile(options, caller)
  }

}

export function loadTbListFromTsTypeFile<T extends TTableListModel>(
  callerFuncNames: Options['callerFuncNames'],
): DbTables<T> {

  const ret = genTbListFromType<T>({
    callerFuncNames,
    stackDepth: 4,
  })

  return ret
}


export function loadTbListFromJsBuiltFile<T extends TTableListModel>(
  options: Options,
  caller: CallerInfo,
): DbTables<T> {

  const { outputFileNameSuffix, forceLoadTbListJsPathReplaceRules } = options

  let path = `${caller.path.slice(0, -3)}.${outputFileNameSuffix}.js`
  path = reWriteLoadingPath(path, forceLoadTbListJsPathReplaceRules)

  accessSync(path, constants.R_OK)

  const ret = loadVarFromFile<T>(path, caller, options)
  return ret
}

