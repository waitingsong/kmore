/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import * as Knex from 'knex'
import {
  JointTable,
  Tables,
  MultiTableCols,
  MultiTableScopedCols,
  KTablesBase,
  Options,
  DbPropKeys,
  TTables,
  ColumnExtPropKeys,
} from 'kmore-types'


export {
  MultiTableCols,
  Options,
  Tables,
  TTables,
}

export {
  PathReWriteRule,
  BuildSrcOpts,
  CacheMap,
  CallerFuncNameSet,
  CallerIdToLocalTypeIdMap,
  LocalTypeId,
  CallerId,
  CallerTypeId,
  CallerTbListMap,
  LocalTypeMap,
  CallerTypeMap,
  TbListTagMap,
  TbListMap,
  GenericsArgName,
  CallerInfo,
  CallerTypeIdInfo,
  GenTbListFromTypeOpts,
  RetrieveInfoFromTypeOpts,
  CallerFuncName,
  ColumnType,
  BaseTbType,
  BaseTbListType,
  TableAlias,
  TableName,
  FilePath,
  FileName,
} from 'kmore-types'


export type Config = Knex.Config

/**
 * K(more)Tables array contains:
 *  tables: tables name
 *  columns: columns name of the tables
 *  scopedColumns: columns name with table prefix of the tables
 */
export interface KTables<T extends TTables> extends KTablesBase<T> {
  /**
  * Columns mapping object, column name with table prefix, eg tb_foo.user
  * ```json
  * {
  *    tb_alias: { col_alias: "table_name.col_name", ...,}
  * }
  * ```
  */
  scopedColumns: MultiTableScopedCols<T>
  aliasColumns: MultiTableAliasColumns<T>
}

export interface KmoreOpts {
  config: Config
  options?: Partial<Options>
}

/**
 * Generate knex method refer to tables.
 * method name from keyof T, ReturnType is the type according to the key,
 * props both enumerable and unenumerable.
 *
 * @description T = { user: {id: number, name: string} }
 *  will get db.user() => Knex.QueryBuilder<{id: number, name: string}>
 */
export interface DbModel<T extends TTables> {
  readonly [DbPropKeys.dbh]: Knex
  /** tables.tb_foo output table name of tb_foo */
  readonly [DbPropKeys.tables]: Tables<T>
  /** columns.tb_foo.ctime output col name, eg. `ctime` */
  readonly [DbPropKeys.columns]: MultiTableCols<T>
  /** scopedColumns.tb_foo.ctime output col name with table prefix, eg. `tb_foo.ctime` */
  readonly [DbPropKeys.scopedColumns]: MultiTableScopedCols<T>
  readonly [DbPropKeys.aliasColumns]: MultiTableAliasColumns<T>
  readonly [DbPropKeys.refTables]: DbRefBuilder<T>
}
/** @deprecated use `TTables` instead */
export type TTableListModel = object


/** Type of db.refTables */
export type DbRefBuilder<T> = {
  /** tbName: () => knex('tb_name') */
  [key in keyof T]: TbQueryBuilder<T[key], T[key][]>
}
export type TbQueryBuilder<TRecord, TResult = TRecord[]>
  = <R = void, KeyExcludeOptional = void>() => R extends TTables
    ? Knex.QueryBuilder<JointTable<TRecord, R, KeyExcludeOptional>, JointTable<TRecord, R, KeyExcludeOptional>[]>
    : Knex.QueryBuilder<TRecord, TResult>


export type CreateColumnNameFn = (options: CreateColumnNameOpts) => string
export interface CreateColumnNameOpts {
  tableName: string
  columnName: string
}


export type MultiTableAliasColumns<T extends TTables> = {
  [tbAlias in keyof T]: JointTableColumns<T[tbAlias]>
}
// export type JointTableColumns<TAliasCols = any> = AliasTableColumns<TAliasCols >
export type JointTableColumns<TAliasCols = any> = AliasTableColumns<TAliasCols> & {
  [ColumnExtPropKeys.genFieldsAliasFn]<T extends AliasTableColumns<TAliasCols> = any>(
    // this: T,
    keyArr: ((keyof T) | '*')[],
    /** Default: false */
    useColAliasNameAsOutputName?: boolean,
  ): KnexColumnsParma,
}
export type AliasTableColumns<TAliasCols = any> = {
  [col in keyof TAliasCols]: ColAlias<TAliasCols[col]>
}
/**
 * {
 *   // jointTableColumns.output: jointTableColumns.inupt
 *   tbUserDetailUid: 'tb_user_detail.uid',
 *   tbUserDetailAge: 'tb_user_detail.age',
 * }
 */
export interface KnexColumnsParma {
  [out: string]: string
}


export interface ColAlias<TColType> {
  /** input column name */
  input: string
  /** output column alias name */
  output: string
  _typePlaceholder: TColType
}
export type JointRetTable<K extends JointTableColumns> = {
  [col in keyof K]: K[col]['_typePlaceholder']
}

