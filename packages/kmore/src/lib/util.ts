// eslint-disable-next-line import/no-extraneous-dependencies
import * as Knex from 'knex'
import {
  validateParamTables,
  createNullObject,
  KTablesBase,
} from 'kmore-types'

import { DbPropKeys } from './config'
import { DbModel, DbRefBuilder, Options, TTables, KTables } from './model'


// workaround for rollup
const _Knex = Knex

export function bindDbh<T extends TTables>(
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


export function bindTables<T extends TTables>(
  propDescriptor: PropertyDescriptor,
  db: DbModel<T>,
  kTables?: KTablesBase<T>,
): DbModel<T> {

  const key = DbPropKeys.tables

  if (kTables && kTables.tables && Object.keys(kTables.tables).length) {
    validateParamTables(kTables.tables)
    Object.defineProperty(db, DbPropKeys.tables, {
      ...propDescriptor,
      value: { ...kTables.tables },
    })
  }
  else {
    Object.defineProperty(db, key, {
      ...propDescriptor,
      value: {},
    })
  }

  return db
}


export function bindTablesCols<T extends TTables>(
  propDescriptor: PropertyDescriptor,
  db: DbModel<T>,
  kTables?: KTablesBase<T>,
): DbModel<T> {

  const key = DbPropKeys.columns
  Object.defineProperty(db, key, {
    ...propDescriptor,
    value: kTables && kTables.columns ? kTables.columns : {},
  })

  // error: ColumnExtPropKeys missing, so assign above directly.
  // if (kTables && kTables.columns && Object.keys(kTables.columns).length) {
  //   Object.entries(kTables.columns).forEach((row) => {
  //     // eslint-disable-next-line prefer-destructuring
  //     const tb: string = row[0]
  //     // eslint-disable-next-line prefer-destructuring
  //     const col = row[1] as MultiTableCols<T>
  //     Object.defineProperty(db[key], tb, {
  //       ...propDescriptor,
  //       value: { ...col },
  //     })
  //   })
  // }

  return db
}


export function bindTablesScopedCols<T extends TTables>(
  propDescriptor: PropertyDescriptor,
  db: DbModel<T>,
  kTables?: KTables<T>,
): DbModel<T> {

  const key = DbPropKeys.scopedColumns
  Object.defineProperty(db, key, {
    ...propDescriptor,
    value: kTables && kTables.scopedColumns ? kTables.scopedColumns : {},
  })

  return db
}


export function bindRefTables<T extends TTables>(
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

export function hasScopedColumns<T extends TTables>(
  tables: KTablesBase<T> | KTables<T>,
): tables is KTables<T> {

  // eslint-disable-next-line no-prototype-builtins
  return !! (tables && tables.hasOwnProperty(DbPropKeys.scopedColumns))
}

