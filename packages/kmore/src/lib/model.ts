/* eslint-disable import/no-extraneous-dependencies */
import * as Knex from 'knex'


export {
  Options,
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
  GenGenericsArgMapOpts,
  ColumnType,
  BaseTbType,
  BaseTbListType,
  PlainJsonValueType,
  JsonType,
  TableAlias,
  TableName,
  FilePath,
  FileName,
} from 'kmore-types'


export type Config = Knex.Config


/**
 * Generate knex method refer to tables.
 * method name from keyof T, ReturnType is the type according to the key,
 * props both enumerable and unenumerable.
 *
 * @description T = { user: {id: number, name: string} }
 *  will get db.user() => Knex.QueryBuilder<{id: number, name: string}>
 */
export interface DbModel<T extends TTableListModel> {
  readonly dbh: Knex
  readonly tables: DbTables<T>
  readonly rb: DbRefBuilder<T>
}
export type TTableListModel = object

/**
 * Type of db.tables
 */
export type DbTables<T extends TTableListModel> = T extends void
  ? EmptyTbList
  : T extends never ? EmptyTbList : Record<keyof T, string>
export interface EmptyTbList {
  readonly [key: string]: never
}

/** Type of db.refTables */
export type DbRefBuilder<T> = {
  /** tbName: () => knex('tb_name') */
  [key in keyof T]: TbQueryBuilder<T[key]>
}
export type TbQueryBuilder<TName> = () => Knex.QueryBuilder<TName>

