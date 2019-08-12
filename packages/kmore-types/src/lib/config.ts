import { CacheMap, Options, GenTbListFromTypeOpts, BuildSrcOpts } from './model'


export const initGenTbListFromTypeOpts: GenTbListFromTypeOpts = {
  callerDistance: 1,
  callerFuncNames: ['genTbListFromType', 'kmore'],
}

export const initOptions: Options = {
  ...initGenTbListFromTypeOpts,
  exportVarPrefix: 'tbs',
  forceLoadTbListJs: false,
  forceLoadTbListJsPathReplaceRules: null,
  outputBanner: '/* eslint-disable */',
  outputFileNameSuffix: '__built-tables',
  refTablesPrefix: 'reftb_',
}

export const initBuildSrcOpts: Required<BuildSrcOpts> = {
  ...initOptions,
  path: [],
  concurrent: 5,
}

export const reservedTbListKeys: string[] = [
  'constructor',
  '__proto__',
]
export enum DbPropKeys {
  'dbh' = 'dbh',
  'tables' = 'tables',
  'refTables' = 'rb',
}

export const defaultPropDescriptor: PropertyDescriptor = {
  configurable: false,
  enumerable: true,
  writable: false,
} as const


export const cacheMap: CacheMap = {
  /** CallerId -> TbListParam */
  tbListMap: new Map(),
  /** CallerId -> LocalTypeId */
  callerIdToLocalTypeIdMap: new Map(),
  /** LocalTypeId -> TableListTagMap */
  localTypeMap: new Map(),
}
