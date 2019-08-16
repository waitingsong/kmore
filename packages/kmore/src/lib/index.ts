// eslint-disable-next-line import/no-extraneous-dependencies
import * as Knex from 'knex'
import { validateParamTables, createNullObject, getCallerStack } from 'kmore-types'

import { defaultPropDescriptor, DbPropKeys, initOptions } from './config'
import {
  DbModel, DbTables, DbRefBuilder, Options, TTableListModel, Config,
} from './model'
import { loadTbListParamFromCallerInfo } from './tables'


// workaround for rollup
const _Knex = Knex

/**
 * Knex factory with type-safe tables accessor
 *
 * @description T = { user: {id: number, name: string} }
 *  Initialize db connection and generate type-safe tables accessor (name and builder)
 *  will get
 *    - db.dbh : the connection instance of knex
 *      eg. db.dbh<OtherType>('tb_other').select()
 *    - db.tables : tables name accessor containing table key/value paris
 *    - db.rb : tables builder accessor,
 *      eg. db.rb.user() =>  Knex.QueryBuilder<{id: number, name: string}>
 *  tables will be generated from generics automaitically when passing undefined or null value
 */
export function kmore<T extends TTableListModel>(
  config: Config,
  /** Auto generate tables from generics, if value is undefined or null */
  tables?: DbTables<T> | null,
  options?: Partial<Options>,
): DbModel<T> {

  const opts = options
    ? { ...initOptions, ...options }
    : { ...initOptions }

  let tbs = {} as DbTables<T>
  if (typeof tables === 'undefined' || tables === null) {
    // detect running env of the caller
    const caller = getCallerStack(opts.callerDistance)
    tbs = loadTbListParamFromCallerInfo(opts, caller)
  }
  else {
    tbs = tables ? { ...tables } : createNullObject()
  }

  let db: DbModel<T> = createNullObject()
  db = bindDbh<T>(defaultPropDescriptor, db, config)
  db = bindTables<T>(defaultPropDescriptor, db, tbs)
  db = bindRefTables<T>(opts, defaultPropDescriptor, db)

  return db
}


function bindDbh<T extends TTableListModel>(
  propDescriptor: PropertyDescriptor,
  db: DbModel<T>,
  config: Knex.Config,
): DbModel<T> {

  Object.defineProperty(db, DbPropKeys.dbh, {
    ...propDescriptor,
    value: _Knex(config),
  })

  return db
}


function bindTables<T extends TTableListModel>(
  propDescriptor: PropertyDescriptor,
  db: DbModel<T>,
  tables?: DbTables<T>,
): DbModel<T> {

  validateParamTables(tables)

  Object.defineProperty(db, DbPropKeys.tables, {
    ...propDescriptor,
    value: tables,
  })

  return db
}


function bindRefTables<T extends TTableListModel>(
  options: Options,
  propDescriptor: PropertyDescriptor,
  db: DbModel<T>,
): DbModel<T> {

  const rb: DbRefBuilder<T> = createNullObject()

  Object.defineProperty(db, DbPropKeys.refTables, {
    ...propDescriptor,
    value: rb,
  })

  if (db.tables) {
    Object.keys(db.tables).forEach((refName) => {
      Object.defineProperty(rb, refName, {
        ...propDescriptor,
        value: (): Knex.QueryBuilder => db.dbh(refName),
      })
      // @ts-ignore
      Object.defineProperty(rb[refName], 'name', {
        ...propDescriptor,
        value: `${options.refTablesPrefix}${refName}`,
      })
    })
  }

  return db
}

