import { accessSync, constants } from 'fs'

import {
  BuildSrcOpts,
  getCallerStack,
  genTbListFromType as genTbListFromTypeOri,
  isTsFile,
  loadVarFromFile,
  reWriteLoadingPath,
} from 'kmore-types'

import {
  CallerInfo,
  DbTables,
  Options,
  TTableListModel,
} from './model'
import { initOptions } from './config'


/**
 * Generate DbTables from generics type T
 * Loading compiled js file if prod env
 */
export function genTbListFromType<T extends TTableListModel>(
  // options?: Partial<GenTbListFromTypeOpts>,
  options?: Partial<Options>,
): DbTables<T> {

  const opts = options
    ? { ...initOptions, ...options }
    : { ...initOptions }

  if (process.env.NODE_ENV === 'production') {
    opts.forceLoadTbListJs = true
    if (opts.forceLoadTbListJsPathReplaceRules === null) {
      opts.forceLoadTbListJsPathReplaceRules = [ [/\/src\//u, '/dist/'] ]
    }
  }
  const caller = getCallerStack(opts.callerDistance)
  const ret = loadTbListParamFromCallerInfo<T>(opts, caller)
  return ret
}

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

  const ret = genTbListFromTypeOri<T>({ callerDistance })
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

