/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import {
  JointTable,
  Tables,
  MultiTableCols,
  MultiTableAliasCols,
  KTablesBase,
  Options,
  DbPropKeys,
  TTables,
  TableAliasCols,
  ColAliasType,
  KnexColumnsParma,
  TableModel,
} from 'kmore-types'
import * as Knex from 'knex'


export {
  MultiTableCols,
  Options,
  Tables,
  TTables,
  MultiTableAliasCols,
  TableAliasCols,
  ColAliasType,
  KnexColumnsParma,
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
  * For table joint
  * ```json
  * {
  *   tb_user: {
  *     tbUserUid: "tb_user.uid",
  *     tbUserName: "tb_user.name",
  *     ...
  *   },
  *   tb_user_detail: {...},
  *   ...,
  * }
  * ```
  */
  aliasColumns: MultiTableAliasCols<T>
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
  scopedColumns: MultiTableCols<T>
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
  readonly [DbPropKeys.scopedColumns]: MultiTableCols<T>
  readonly [DbPropKeys.aliasColumns]: MultiTableAliasCols<T>
  readonly [DbPropKeys.refTables]: DbRefBuilder<T>
}


/** Type of db.refTables */
export type DbRefBuilder<T extends TTables> = {
  /** tbName: () => knex('tb_name') */
  [tb in keyof T]: TbQueryBuilder<T[tb], T[tb][]>
}
export type TbQueryBuilder<TRecord extends TableModel, TResult = TRecord[]>
  = <R = void, KeyExcludeOptional = void>() => R extends TableModel
    ? Knex.QueryBuilder<JointTable<TRecord, R, KeyExcludeOptional>, JointTable<TRecord, R, KeyExcludeOptional>[]>
    : Knex.QueryBuilder<TRecord, TResult>


export type CreateColumnNameFn = (options: CreateColumnNameOpts) => string
export interface CreateColumnNameOpts {
  tableName: string
  columnName: string
}

export enum EnumClient {
  pg = 'pg',
  mssql = 'mssql',
  mysql = 'mysql',
  mysql2 = 'mysql2',
  sqlite3 = 'sqlite3',
  oracledb = 'oracledb',
}

