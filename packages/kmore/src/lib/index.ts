/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  createNullObject,
  getCallerStack,
  DbDictBase,
  KmorePropKeys,
  hasExtColumns,
  genDbDictFromBase,
  loadDbDictParamFromCallerInfo,
  DbDictModel,
} from 'kmore-types'

import { defaultPropDescriptor, initOptions } from './config'
import { Kmore, DbModel, KmoreOpts, DbDict } from './model'
import {
  bindDbh,
  bindTables,
  bindTablesCols,
  bindRefTables,
  bindTablesScopedCols,
  bindTablesAliasCols,
} from './util'


/**
 * Knex factory with type-safe tables accessor
 *
 * @description D = { user: {id: number, name: string} }
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
export function kmore<D extends DbModel, Dict extends DbDictModel | void = void>(
  kmoreOpts: KmoreOpts,
  /**
   * Auto generate tables from generics, if value is void|null.
   * Disabled when false,
   * Throw error when empty object `{}`
   */
  dbDict?: DbDictBase<D> | DbDict<D> | void | null | false,
): Kmore<D, Dict> {
  const { config, options } = kmoreOpts
  const opts = options
    ? { ...initOptions, ...options }
    : { ...initOptions }

  let kdd = {} as DbDict<D>
  if (dbDict) {
    if (Object.keys(dbDict).length) {
      // eslint-disable-next-line max-len
      kdd = hasExtColumns<D>(dbDict, KmorePropKeys.scopedColumns) && hasExtColumns<D>(dbDict, KmorePropKeys.aliasColumns)
        ? dbDict : genDbDictFromBase<D>(dbDict)
    }
    else {
      throw new TypeError('Parameter dbDict is empty')
    }
  }
  else if (dbDict === false) {
    // void, skip generation
  }
  else {
    // detect running env of the caller
    const caller = getCallerStack(opts.callerDistance)
    const base = loadDbDictParamFromCallerInfo<D>(opts, caller)

    kdd = genDbDictFromBase<D>(base)
  }

  let km = createNullObject() as Kmore<D>
  km = bindDbh<D>(defaultPropDescriptor, km, config)
  km = bindTables<D>(defaultPropDescriptor, km, kdd)
  km = bindTablesCols<D>(defaultPropDescriptor, km, kdd)
  km = bindTablesScopedCols<D>(defaultPropDescriptor, km, kdd)
  km = bindTablesAliasCols<D>(defaultPropDescriptor, km, kdd)
  km = bindRefTables<D>(opts, defaultPropDescriptor, km)

  return km as unknown as Kmore<D, Dict>
}

