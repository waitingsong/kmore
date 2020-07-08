/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  validateParamTables,
  createNullObject,
  DbDictBase,
} from 'kmore-types'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as Knex from 'knex'

import { KmorePropKeys } from './config'
import {
  Kmore,
  DbRefBuilder,
  Options,
  DbModel,
  DbDict,
  QueryBuilderExt,
} from './model'


// workaround for rollup
const _Knex = Knex

export function bindDbh<D extends DbModel, T = void>(
  propDescriptor: PropertyDescriptor,
  kmInst: Kmore<D, T>,
  config: Knex.Config,
): Kmore<D, T> {

  Object.defineProperty(kmInst, KmorePropKeys.dbh, {
    ...propDescriptor,
    value: _Knex(config),
  })

  return kmInst
}


export function bindTables<D extends DbModel, T = void>(
  propDescriptor: PropertyDescriptor,
  kmInst: Kmore<D, T>,
  dbDict?: DbDictBase<D, T>,
): Kmore<D, T> {

  const key = KmorePropKeys.tables

  if (dbDict && dbDict.tables && Object.keys(dbDict.tables).length) {
    validateParamTables(dbDict.tables)
    Object.defineProperty(kmInst, KmorePropKeys.tables, {
      ...propDescriptor,
      value: { ...dbDict.tables },
    })
  }
  else {
    Object.defineProperty(kmInst, key, {
      ...propDescriptor,
      value: {},
    })
  }

  return kmInst
}


export function bindTablesCols<D extends DbModel, T = void>(
  propDescriptor: PropertyDescriptor,
  kmInst: Kmore<D, T>,
  dbDict?: DbDictBase<D, T>,
): Kmore<D, T> {

  const key = KmorePropKeys.columns
  Object.defineProperty(kmInst, key, {
    ...propDescriptor,
    value: dbDict && dbDict.columns ? dbDict.columns : {},
  })

  // error: ColumnExtPropKeys missing, so assign above directly.
  // if (dbDict && dbDict.columns && Object.keys(dbDict.columns).length) {
  //   Object.entries(dbDict.columns).forEach((row) => {
  //     // eslint-disable-next-line prefer-destructuring
  //     const tb: string = row[0]
  //     // eslint-disable-next-line prefer-destructuring
  //     const col = row[1] as DbCols<T>
  //     Object.defineProperty(db[key], tb, {
  //       ...propDescriptor,
  //       value: { ...col },
  //     })
  //   })
  // }

  return kmInst
}


export function bindTablesScopedCols<D extends DbModel, T = void>(
  propDescriptor: PropertyDescriptor,
  kmInst: Kmore<D, T>,
  dbDict?: DbDict<D, T>,
): Kmore<D, T> {

  const key = KmorePropKeys.scopedColumns
  Object.defineProperty(kmInst, key, {
    ...propDescriptor,
    value: dbDict && dbDict.scopedColumns ? dbDict.scopedColumns : {},
  })

  return kmInst
}


export function bindTablesAliasCols<D extends DbModel, T = void>(
  propDescriptor: PropertyDescriptor,
  kmInst: Kmore<D, T>,
  dbDict?: DbDict<D, T>,
): Kmore<D, T> {

  const key = KmorePropKeys.aliasColumns
  Object.defineProperty(kmInst, key, {
    ...propDescriptor,
    value: dbDict && dbDict.aliasColumns ? dbDict.aliasColumns : {},
  })

  return kmInst
}


export function bindRefTables<D extends DbModel, T = void>(
  options: Options,
  propDescriptor: PropertyDescriptor,
  kmInst: Kmore<D, T>,
): Kmore<D, T> {

  const rb = createNullObject() as DbRefBuilder<D>
  // const { aliasColumns: dbAliasCols } = kmInst

  Object.defineProperty(kmInst, KmorePropKeys.refTables, {
    ...propDescriptor,
    value: rb,
  })

  Object.keys(kmInst.tables).forEach((refName) => {
    Object.defineProperty(rb, refName, {
      ...propDescriptor,
      value: (): QueryBuilderExt<D[keyof D]> => extRefTableFnProperty(kmInst, refName), // must dynamically!!
    })

    Object.defineProperty(rb[refName as keyof typeof rb], 'name', {
      ...propDescriptor,
      value: `${options.refTablesPrefix}${refName}`,
    })
  })

  return kmInst
}


function extRefTableFnProperty<D extends DbModel, T = void>(
  db: Kmore<D, T>,
  refName: keyof D,
): QueryBuilderExt<D[keyof D]> {

  const rbTableObj = db.dbh(refName as string)
  // rbTableObj = extRefTableFnKAlias(db, refName, rbTableObj)

  return rbTableObj as QueryBuilderExt<D[keyof D]>
}

// function extRefTableFnKAlias<T extends DbModel>(
//   db: Kmore<T>,
//   refName: keyof T,
//   rbTableObj: QueryBuilderExt | Knex.QueryBuilder,
// ): QueryBuilderExt {

//   console.info('fafaf', { db, refName })

//   const ret = rbTableObj

//   const propDescriptor: PropertyDescriptor = {
//     configurable: false,
//     enumerable: true,
//     writable: false,
//   }

//   // @ts-expect-error
//   const fn: QueryBuilderExt['kColumn'] = (alias: any | any[]) => {
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-call
//     return ret.columns(alias)
//   }

//   Object.defineProperty(ret, 'kColumn', {
//     ...propDescriptor,
//     value: fn,
//   })

//   return ret as QueryBuilderExt
// }

