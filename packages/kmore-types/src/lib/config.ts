import {
  BuildSrcOpts,
  CacheMap,
  CallerId,
  CallerFuncNameSet,
  GenDbDictFromTypeOpts,
  LocalTypeId,
  DbCols,
  Options,
  Tables,
  TagsMapArr,
  DbModel,
  CreateColumnNameOpts,
} from './model'


export const globalCallerFuncNameSet: CallerFuncNameSet = new Set(['genDbDictFromType', 'kmore'])

export const initGenDbDictFromTypeOpts: GenDbDictFromTypeOpts = {
  callerDistance: 0,
}

export const initOptions: Options = {
  ...initGenDbDictFromTypeOpts,
  exportVarPrefix: 'dict_',
  forceLoadDbDictJs: false,
  forceLoadDbDictJsPathReplaceRules: null,
  outputBanner: '/* eslint-disable */',
  outputFileNameSuffix: '__built-dict',
  refTablesPrefix: 'reftb_',
  DictTypeSuffix: 'Dict',
  DictTypeFolder: './',
  DictTypeFile: '.kmore.ts',
  DictTypeBanner: '/* eslint-disable */\n/* tslint-disalbe */',
}

export const initBuildSrcOpts: Required<BuildSrcOpts> = {
  ...initOptions,
  path: [],
  concurrent: 5,
  excludePathKeys: ['node_modules'],
  maxScanLines: 128,
  columnNameCreationFn: defaultCreateScopedColumnName,
}

export const reservedTbListKeys: string[] = [
  'constructor',
  '__proto__',
]

export const defaultPropDescriptor: PropertyDescriptor = {
  configurable: true,
  enumerable: true,
  writable: false,
} as const


export const cacheMap: CacheMap = {
  /** CallerId -> TbListParam */
  dbMap: new Map<CallerId, Tables<DbModel>>(),
  dbColsMap: new Map<CallerId, DbCols<DbModel>>(),
  /** CallerId -> LocalTypeId */
  callerIdToLocalTypeIdMap: new Map<CallerId, LocalTypeId>(),
  /** LocalTypeId -> TableListTagMap */
  localTypeMap: new Map<LocalTypeId, TagsMapArr>(),
}


export function defaultCreateScopedColumnName(options: CreateColumnNameOpts): string {
  const { tableName, columnName } = options
  return `${tableName}.${columnName}`
}

