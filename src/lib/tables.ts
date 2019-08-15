import { accessSync, constants } from 'fs'

import {
  BuildSrcOpts,
  isTsFile,
  genTbListFromType,
  loadVarFromFile,
  reWriteLoadingPath,
} from 'kmore-types'

import {
  CallerInfo,
  DbTables,
  Options,
  TTableListModel,
} from './model'


export function loadTbListParamFromCallerInfo<T extends TTableListModel>(
  options: Options,
  caller: CallerInfo,
): DbTables<T> {

  if (! options.forceLoadTbListJs && isTsFile(caller.path)) {
    return loadTbListFromTsTypeFile<T>(options.callerDistance + 3)
  }
  else { // run in js or debug in ts
    return loadTbListFromJsBuiltFile(options, caller)
  }
}

export function loadTbListFromTsTypeFile<T extends TTableListModel>(
  callerDistance: BuildSrcOpts['callerDistance'],
): DbTables<T> {

  const ret = genTbListFromType<T>({ callerDistance })
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

