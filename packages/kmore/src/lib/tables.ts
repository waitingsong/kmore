import { accessSync, constants } from 'fs'

import {
  BuildSrcOpts,
  getCallerStack,
  genTbListFromType as genTbListFromTypeOri,
  isTsFile,
  KTablesBase,
  reWriteLoadingPath,
  loadVarFromFile,
} from 'kmore-types'

import { initOptions } from './config'
import {
  CallerInfo,
  Options,
  TTables,
  KTables,
} from './model'
import { genKTablesFromBase } from './util'


/**
 * Generate KTables from generics type T
 * Loading compiled js file if prod env
 */
export function genTbListFromType<T extends TTables>(
  // options?: Partial<GenTbListFromTypeOpts>,
  options?: Partial<Options>,
): KTables<T> {

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
  const base: KTablesBase<T> = loadTbListParamFromCallerInfo<T>(opts, caller)
  const ktbs = genKTablesFromBase(base)

  return ktbs
}

export function loadTbListParamFromCallerInfo<T extends TTables>(
  options: Options,
  caller: CallerInfo,
): KTablesBase<T> {

  if (! options.forceLoadTbListJs && isTsFile(caller.path)) {
    return loadTbListFromTsTypeFile<T>(options.callerDistance + 3)
  }
  else { // run in js or debug in ts
    return loadTbListFromJsBuiltFile(options, caller)
  }
}


export function loadTbListFromTsTypeFile<T extends TTables>(
  callerDistance: BuildSrcOpts['callerDistance'],
): KTablesBase<T> {

  const ret = genTbListFromTypeOri<T>({ callerDistance })
  return ret
}

export function loadTbListFromJsBuiltFile<T extends TTables>(
  options: Options,
  caller: CallerInfo,
): KTablesBase<T> {

  const { outputFileNameSuffix, forceLoadTbListJsPathReplaceRules } = options

  let path = `${caller.path.slice(0, -3)}.${outputFileNameSuffix}.js`
  path = reWriteLoadingPath(path, forceLoadTbListJsPathReplaceRules)

  accessSync(path, constants.R_OK)

  const ret = loadVarFromFile<T>({ path, caller, options })
  return ret
}

