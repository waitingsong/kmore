import {
  BuildSrcOpts,
  CacheMap,
  CallerId,
  CallerFuncNameSet,
  GenTbListFromTypeOpts,
  LocalTypeId,
  MultiTableCols,
  Options,
  Tables,
  TagsMapArr,
  TTables,
} from './model'


export const globalCallerFuncNameSet: CallerFuncNameSet = new Set(['genTbListFromType', 'kmore'])

export const initGenTbListFromTypeOpts: GenTbListFromTypeOpts = {
  callerDistance: 0,
}

export const initOptions: Options = {
  ...initGenTbListFromTypeOpts,
  exportVarPrefix: 'tbs_',
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
  excludePathKeys: ['node_modules'],
  maxScanLines: 128,
}

export const reservedTbListKeys: string[] = [
  'constructor',
  '__proto__',
]
export enum DbPropKeys {
  'dbh' = 'dbh',
  'tables' = 'tables',
  'columns' = 'columns',
  'scopedColumns' = 'scopedColumns',
  'aliasColumns' = 'aliasColumns',
  'refTables' = 'rb',
}

export const defaultPropDescriptor: PropertyDescriptor = {
  configurable: true,
  enumerable: true,
  writable: false,
} as const


export const cacheMap: CacheMap = {
  /** CallerId -> TbListParam */
  tbListMap: new Map<CallerId, Tables<TTables>>(),
  tbColListMap: new Map<CallerId, MultiTableCols<TTables>>(),
  /** CallerId -> LocalTypeId */
  callerIdToLocalTypeIdMap: new Map<CallerId, LocalTypeId>(),
  /** LocalTypeId -> TableListTagMap */
  localTypeMap: new Map<LocalTypeId, TagsMapArr>(),
}

