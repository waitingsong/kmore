import * as Knex from 'knex'

import { defaultPropDescriptor, DbPropKeys, initOptions } from './config'
import {
  DbModel, DbTables, DbRefTables, Options, TTableListModel, Config,
} from './model'
import { validateParamTables, createNullObject } from './util'
import { loadTbListParamFromCallerInfo } from './tables'


// workaround for rollup
const _Knex = Knex

/**
 * Knex factory with type-safe tables accessor
 *
 * @description T = { user: {id: number, name: string} }
 *  will get
 *    - db.dbh for custom usage or transaction. eg. db.dbh<OtherType>('tb_other').select()
 *    - db.tables
 *    - db.refTables.user() => Knex.QueryBuilder<{id: number, name: string}>
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function kmore<T extends TTableListModel>(
  config: Config,
  options?: Partial<Options>,
): DbModel<T> {

  const opts = options
    ? { ...initOptions, ...options }
    : { ...initOptions }

  const tables: DbTables<T> = loadTbListParamFromCallerInfo(opts)

  let db: DbModel<T> = createNullObject()
  db = bindDbh<T>(defaultPropDescriptor, db, config)
  db = bindTables<T>(defaultPropDescriptor, db, tables)
  db = bindRefTables<T>(opts, defaultPropDescriptor, db)

  return Object.freeze(db)
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

  const refTables: DbRefTables<T> = createNullObject()

  Object.defineProperty(db, DbPropKeys.refTables, {
    ...propDescriptor,
    value: refTables,
  })

  if (db.tables) {
    Object.keys(db.tables).forEach((refName) => {
      Object.defineProperty(refTables, refName, {
        ...propDescriptor,
        value: (): Knex.QueryBuilder => db.dbh(refName),
      })
      // @ts-ignore
      Object.defineProperty(refTables[refName], 'name', {
        ...propDescriptor,
        value: `${options.refTablesPrefix}${refName}`,
      })
    })
  }

  return db
}

