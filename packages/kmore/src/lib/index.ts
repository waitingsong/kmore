import { createNullObject, getCallerStack, KTablesBase, DbPropKeys } from 'kmore-types'

import { defaultPropDescriptor, initOptions } from './config'
import { DbModel, TTables, KmoreOpts, KTables } from './model'
import { loadTbListParamFromCallerInfo } from './tables'
import {
  bindDbh,
  bindTables,
  bindTablesCols,
  bindRefTables,
  bindTablesScopedCols,
  hasExtColumns,
  genKTablesFromBase,
  bindTablesAliasCols,
} from './util'


/**
 * Knex factory with type-safe tables accessor
 *
 * @description T = { user: {id: number, name: string} }
 *  Initialize db connection and generate type-safe tables accessor (name and builder)
 *  will get
 *    - db.dbh : the connection instance of knex
 *        eg. db.dbh<OtherType>('tb_other').select()
 *    - db.tables : tables name accessor containing table key/value paris
 *    - db.columns : table column names accessor containing table key/value paris
 *    - db.scopedColumns : table column names accessor containing table key/value paris, with table prefix
 *    - db.rb : tables builder accessor,
 *        eg. db.rb.user() =>  Knex.QueryBuilder<{id: number, name: string}>
 *  tables will be generated from generics automaitically when passing undefined or null value
 */
export function kmore<T extends TTables>(
  kmoreOpts: KmoreOpts,
  /**
   * Auto generate tables from generics, if value is void|null.
   * Disabled when false,
   * Throw error when empty object `{}`
   */
  kTables?: KTablesBase<T> | KTables<T> | void | null | false,
): DbModel<T> {
  const { config, options } = kmoreOpts
  const opts = options
    ? { ...initOptions, ...options }
    : { ...initOptions }

  let ktbs = {} as KTables<T>
  if (kTables) {
    if (Object.keys(kTables).length) {
      ktbs = hasExtColumns(kTables, DbPropKeys.scopedColumns) && hasExtColumns(kTables, DbPropKeys.aliasColumns)
        ? kTables
        : genKTablesFromBase(kTables)
    }
    else {
      throw new TypeError('Parameter kTables is empty')
    }
  }
  else if (kTables === false) {
    // void, skip generation
  }
  else {
    // detect running env of the caller
    const caller = getCallerStack(opts.callerDistance)
    const base = loadTbListParamFromCallerInfo<T>(opts, caller)

    ktbs = genKTablesFromBase(base)
  }

  let db = createNullObject() as DbModel<T>
  db = bindDbh<T>(defaultPropDescriptor, db, config)
  db = bindTables<T>(defaultPropDescriptor, db, ktbs)
  db = bindTablesCols<T>(defaultPropDescriptor, db, ktbs)
  db = bindTablesScopedCols<T>(defaultPropDescriptor, db, ktbs)
  db = bindTablesAliasCols<T>(defaultPropDescriptor, db, ktbs)
  db = bindRefTables<T>(opts, defaultPropDescriptor, db)

  return db
}

