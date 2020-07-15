/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import {
  AliasColumn,
  DbModel,
  TableAliasCols,
  TableModel,
} from '@waiting/shared-types'
import type {
  CallExpression,
  JSDocTagInfo,
  SourceFile,
  TypeChecker,
} from 'typescript'


export {
  AliasColumn,
  DbModel,
  TableAliasCols,
  TableModel,
}

export enum KmorePropKeys {
  'dbh' = 'dbh',
  'tables' = 'tables',
  'columns' = 'columns',
  'scopedColumns' = 'scopedColumns',
  'aliasColumns' = 'aliasColumns',
  'refTables' = 'rb',
  /**
  * Type ref to generics param Db only, do NOT access as variable!
  * @example ```ts
  * const km = kmore<Db, KDD>({ config })
  * type DbRef = typeof km.DbModel
  * type User = DbRef['tb_user']  // equal to Db['tb_user']
  * ```
  */
  'DbModel' = 'DbModel',
  'DbModelAlias' = 'DbModelAlias',
  'dummy' = 'dymmy',
}

export interface DbDictModel {
  [KmorePropKeys.tables]: Record<string, string>
  [KmorePropKeys.columns]: DbCols
  [KmorePropKeys.scopedColumns]: DbCols
  [KmorePropKeys.aliasColumns]: DbAliasCols
}
type DbDictModelBase = Pick<DbDictModel, KmorePropKeys.tables | KmorePropKeys.columns>

/**
 * K(more)Tables array contains:
 *  tables: tables name
 *  columns: columns name of the tables
 */
export interface DbDictBase<D extends DbModel = DbModel, DD extends DbDictModelBase | void = void> {
  /**
   * Tables alias/name pairs
   * { tb_name: "tb_name" }
   */
  tables: 'tables' extends keyof DD
    ? Tables<D, DD['tables']>
    : Tables<D>

  /**
   * Columns mapping object, tb_name w/o table prefix
   * ```json
   * {
   *    tb_name: { col_alias: "col_name", ..., }
   * }
   * ```
   */
  columns: 'columns' extends keyof DD
    ? DbCols<D, DD['columns']>
    : DbCols<D>
}
/**
 * K(more)Tables array contains:
 *  tables: tables name
 *  columns: columns name of the tables
 *  scopedColumns: columns name with table prefix of the tables
 */
export interface DbDict<D extends DbModel = DbModel, DD extends DbDictModel | void = void>
  extends DbDictBase<D, DD> {
  /**
  * For table joint
  * ```json
  * {
  *   tb_user: {
  *     tbUserUid: "tb_user.uid",
  *     tbUserName: "tb_user.name",
  *     ...
  *   },
  *   tb_user_detail: {
  *     tbUserDetailUid: "tb_user_detail.uid"
  *   },
  *   ...,
  * }
  * ```
  */
  aliasColumns: 'aliasColumns' extends keyof DD
    ? DbAliasCols<D, DD['aliasColumns']>
    : DbAliasCols<D>
  /**
  * Columns mapping object, column name with table prefix, eg tb_foo.user
  * ```json
  * {
  *   tb_user: {
  *     uid: "tb_user.uid",
  *     name: "tb_user.name",
  *     ...
  *   },
  *   tb_user_detail: {...},
  *   ...,
  * }
  * ```
  */
  scopedColumns: 'scopedColumns' extends keyof DD
    ? DbCols<D, DD['scopedColumns']>
    : DbCols<D>
}


/**
 * @deprecated use `DbModel` instead
 */
export interface TTables {
  [tb: string]: TableModel
}

export interface Options extends GenDbDictFromTypeOpts {
  /**
   * Function to generate scoped column string with table name and columns name,
   * 'tb_user', 'name' => 'tb_user.name'.
   * false will use original col name w/o table name prefix: 'tb_user', 'name' => 'name',
   * Default value defaultCreateScopedColumnName (in config.ts)
   */
  columnNameCreationFn?: CreateColumnNameFn | false
  /** Exported table vaiable name prefix. Default is "dict_", result will be "dict_m_n" */
  exportVarPrefix: string
  /**
   * Load js under ts env for debug,
   * Default: false
   * Default: true if process.env.NODE_ENV === 'production'
   */
  forceLoadDbDictJs: boolean
  /**
   * Rewrite loading path during forceLoadDbDictJs:true,
   * Default: null
   * Default: [ [/\/src\//u, '/dist/'] ] if process.env.NODE_ENV === 'production'
   * @example [ [/src\//u, 'dist/'] ]
   */
  forceLoadDbDictJsPathReplaceRules: PathReWriteRule[] | null
  /** Banner at the top of target file. Such as "// eslint-disable"  */
  outputBanner: string
  /** File name suffix of built tables. w/o ext, eg: build-dict */
  outputFileNameSuffix: string
  /** Default is reftb_  */
  refTablesPrefix: string
  /** Exported type name suffix. Default is "Dict" */
  DictTypeSuffix: string
  /** File name of auto generated Types of dbDict. Default is ".kmore.ts" */
  DictTypeFileName: string
  /**
   * File folder of auto generated Types of dbDict, relative or absolute folder.
   * Path must exists if is relative path, otherwise overwrited by false.
   * Default is false, under the same dir of the source file
   */
  DictTypeFolder: string | false
  /** Banner at the top of target file. Such as "// eslint-disable"  */
  DictTypeBanner: string
}

export interface BuildSrcOpts extends Partial<Options> {
  /** Base dir or file in both relative and absolute style to scan */
  path: string | string[]
  /** Default: 5 */
  concurrent?: number
  /** String key to skip build under path. Default: node_modules */
  excludePathKeys?: string | string[]
  /** Maxium file lines to match CallerFuncName (import), Default: 128 */
  maxScanLines?: number
}
export interface BuildSrcRet {
  dictPath: FilePath
  DictTypePath: FilePath
}

export interface PathReWriteRule extends Array<RegExp | string> {
  0: RegExp
  1: string
  length: 2
}

export type CallerFuncNameSet = Set<CallerFuncName>
/**
 * Name of the function
 * calling genDbDictFromType() or kmore() and pass with generics type
 */
export type CallerFuncName = string

/**
 * Database Tables Tag Map generated by generics type passing to genTbListFromGenerics<T>()
 */
export type DbMap = Map<CallerId, Tables<DbModel>>
export type DbColsMap = Map<CallerId, DbCols<DbModel>>

/** Define what's genericsTypeId at the callexpression position */
export type CallerIdToLocalTypeIdMap = Map<CallerId, LocalTypeId>


/** Format <caller.path>:typeid-<inputGenericsTypeName> */
export type LocalTypeId = string
/** Format <caller.path>:<line>:<column> */
export type CallerId = string
/** Format <caller.path>:<line>:<column>:typeid-<inputGenericsTypeName> */
export type CallerTypeId = string
export type CallerDbMap<T extends DbModel> = Map<CallerTypeId, TablesMapArr<T>>

export interface TablesMapArr<T extends DbModel>
  extends Array<Tables<T> | DbCols<T>> {
  0: Tables<T>
  1: DbCols<T>
  length: 2
}
export interface TablesMapArrCommon<T extends DbModel>
  extends Array<Tables<T> | DbColsCommon<T>> {
  0: Tables<T>
  1: DbColsCommon<T>
  length: 2
}
export type DbColsCommon<T extends DbModel> = DbCols<T> | DbAliasCols<T>

/** GenericsTypeId scope in the file */
export type LocalTypeMap = Map<LocalTypeId, TagsMapArr>
export type CallerTypeMap = Map<CallerTypeId, TagsMapArr>
export type DbTagMap = Map<TableAlias, JSDocTagInfo[]>

export type DbColsTagMap = Map<TableAlias, TableTagMap>
export type DbScopedColsTagMap = Map<TableAlias, TableTagMap>
export type TableTagMap = Map<TableColAlias, JSDocTagInfo[]>

export interface DbTagsMap {
  dbTagMap: DbTagMap
  dbColsTagMap: DbColsTagMap
  // tbScopedColTagMap: TbScopedColListTagMap
}

export interface LocalTypeItem {
  localTypeId: string
  tagsMapArr?: TagsMapArr
}

export interface TagsMapArr extends Array<DbTagMap | DbColsTagMap> {
  0: DbTagMap
  1: DbColsTagMap
  length: 2
}

export type GenericsArgName = string

export interface CallerInfo {
  path: string
  line: number
  column: number
}
export interface CallerTypeIdInfo extends CallerInfo {
  /** GenericsTypeName as param */
  typeId: string
}

/**
 * kmore.tables, tables dict of the database
 *
 * @example ```ts
 * // T valid:
 * inteface {
 *  tb_user: 'tb_user'
 *  tb_user_detail: 'tb_user'
 * }
 * // T void:
 * inteface {
 *  tb_user: string
 *  tb_user_detail: string
 * }
 * ```
 */
export type Tables<D extends DbModel = DbModel, DD = void> = DD extends void
  ? { [tb in keyof D]: string }
  : { [tb in keyof D]: tb extends keyof DD ? DD[tb] : string }

/**
 * Type of km.columns.tb_foo.col_bar = 'col_bar' | string
 */
export type DbCols<D extends DbModel = DbModel, DD = void> = {
  [tb in keyof D]: tb extends keyof DD
    ? TableFields<D[tb], DD[tb]>
    : TableFields<D[tb], void>
}
export type TableFields<T extends TableModel = TableModel, FTableFields = void>
  = FTableFields extends void
    ? { [F in keyof T]: string }
    : { [F in keyof T]: F extends keyof FTableFields ? FTableFields[F] : string }

/**
 * @example ```ts
 * interface {
 *  tb_user: {
 *    uid: {
 *      tbUserUid: "tb_user.uid"
 *    },
 *    name: {
 *      tbUserName: "tb_user.name"
 *    }
 *  }
 * }
 * ```
 */
export type DbAliasCols<D extends DbModel = DbModel, DD = void> = {
  [tb in keyof D]: tb extends keyof DD
    ? TableAliasCols<D[tb], DD[tb]>
    : TableAliasCols<D[tb]>
}

export type TableAlias = string
export type TableColAlias = string
export type TableName = string
export type FieldName = string
export type FilePath = string
export type FileName = string


export interface GenDbDictFromTypeOpts {
  /**
   * Distance from genDbDictFromType() or kmore(),
   * Default: 0 means calling genDbDictFromType() or kmore()  directly
   */
  callerDistance: number
}
// export interface RetrieveInfoFromTypeOpts extends GenDbDictFromTypeOpts {}
export interface RetrieveInfoFromTypeOpts {
  cacheMap: CacheMap
  caller: CallerInfo
}


export interface CacheMap {
  readonly dbMap: DbMap
  readonly dbColsMap: DbColsMap
  readonly callerIdToLocalTypeIdMap: CallerIdToLocalTypeIdMap
  readonly localTypeMap: LocalTypeMap
}


export interface StackFrame {
  getTypeName: () => string
  getFunctionName: () => string
  getMethodName: () => string
  getFileName: () => string
  getLineNumber: () => number
  getColumnNumber: () => number
  isNative: () => boolean
}

export interface WalkNodeOps {
  sourceFile: SourceFile
  matchFuncNameSet: CallerFuncNameSet
}

export interface WalkNodeWithPositionOps extends WalkNodeOps {
  matchLine: number
  matchColumn: number
}

export interface GenInfoFromNodeOps {
  sourceFile: SourceFile
  checker: TypeChecker
  node: CallExpression
  path: string
  // localTypeMapKeys: string[] // Object.keys(LocalTypeMap)
}

export interface MatchedSourceFile {
  checker: TypeChecker
  sourceFile: SourceFile | null
}

export interface LoadVarFromFileOpts {
  path: string
  caller: CallerInfo
  options: Options
}


export type CreateColumnNameFn = (options: CreateColumnNameOpts) => string
export interface CreateColumnNameOpts {
  tableName: string
  columnName: string
}

