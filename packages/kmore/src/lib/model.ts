/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import {
  DbAliasCols,
  DbCols,
  DbDict,
  DbDictBase,
  DbDictModel,
  DbModel,
  KmorePropKeys,
  KnexColumnsParma,
  Options,
  Tables,
  TableAliasCols,
  TableModel,
  TableModelFromAlias,
} from 'kmore-types'
import type * as Knex from 'knex'


export {
  DbAliasCols,
  DbCols,
  DbDict,
  DbDictBase,
  DbDictModel,
  DbModel,
  KnexColumnsParma,
  Options,
  Tables,
  TableAliasCols,
}

export type KnexConfig = Knex.Config

export interface KmoreOpts {
  config: KnexConfig
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
export interface Kmore<D extends DbModel = DbModel, Dict extends DbDictModel | void = void> extends DbDict<D, Dict> {
  readonly [KmorePropKeys.dbh]: Knex
  readonly [KmorePropKeys.refTables]: DbRefBuilder<D>
  /**
  * Type ref to generics param Db only, do NOT access as variable!
  * @example ```ts
  * const km = kmore<Db, KDD>({ config })
  * type DbRef = typeof km.DbModel
  * type User = DbRef['tb_user']  // equal to Db['tb_user']
  * ```
  */
  readonly [KmorePropKeys.DbModel]: D
  readonly [KmorePropKeys.DbModelAlias]: DbModelFromAlias<D, 'aliasColumns' extends keyof Dict ? Dict['aliasColumns'] : void>
}


type DbModelFromAlias<D extends DbModel, AC = any> = AC extends void
  ? never
  : {
    [tb in keyof D]: tb extends keyof AC
      // @ts-expect-error
      ? TableModelFromAlias<D[tb], AC[tb]>
      : never
  }

// ? TableModelFromAlias<D[tb], Dict['aliasColumns'][tb]>

/** Type of db.refTables */
export type DbRefBuilder<D extends DbModel> = {
  /** tbName: () => knex('tb_name') */
  [tb in keyof D]: TbQueryBuilder<D[tb]>
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TbQueryBuilder<TRecord extends TableModel>
  extends TbQueryBuilderInner<TRecord> { }

export type TbQueryBuilderInner<TRecord extends TableModel>
  = <KeyExcludeOptional extends keyof TRecord | void = void>
  () => QueryBuilderExt<Omit<TRecord, KeyExcludeOptional extends void ? never : KeyExcludeOptional>>

export type QueryBuilderExt<TRecord extends TableModel = TableModel, TResult extends TableModel[] = TRecord[]>
 = Knex.QueryBuilder<TRecord, TResult>


export enum EnumClient {
  pg = 'pg',
  mssql = 'mssql',
  mysql = 'mysql',
  mysql2 = 'mysql2',
  sqlite3 = 'sqlite3',
  oracledb = 'oracledb',
}

