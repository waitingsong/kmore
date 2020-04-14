// eslint-disable-next-line import/no-extraneous-dependencies
import * as Knex from 'knex'
import {
  validateParamTables,
  createNullObject,
  KTablesBase,
  MultiTableCols,
  LoadVarFromFileOpts,
  genVarName,
  loadFile,
  Tables,
} from 'kmore-types'

import { DbPropKeys } from './config'
import {
  DbModel,
  DbRefBuilder,
  Options,
  TTables,
  KTables,
  CreateColumnNameFn,
  MultiTableAliasCols,
} from './model'
import {
  createScopedColumns,
  genColumnsWithExtProps,
  getScopedColumnsColsCache,
  setScopedColumnsColsCache,
  defaultCreateScopedColumnName,
} from './scoped-cols-util'
import { genAliasColumns } from './alias-cols-util'


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


export function bindTablesAliasCols<T extends TTables>(
  propDescriptor: PropertyDescriptor,
  db: DbModel<T>,
  kTables?: KTables<T>,
): DbModel<T> {

  const key = DbPropKeys.aliasColumns
  Object.defineProperty(db, key, {
    ...propDescriptor,
    value: kTables && kTables.aliasColumns ? kTables.aliasColumns : {},
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


/**
 * Generate KTables from generics type T
 * Loading compiled js file if prod env
 */
export function genKTablesFromBase<T extends TTables>(
  kTablesBase: KTablesBase<T>,
  /** false will use original col name w/o table name prefix */
  createColumnNameFn: CreateColumnNameFn | false = defaultCreateScopedColumnName,
): KTables<T> {

  if (hasScopedColumns(kTablesBase)) {
    return kTablesBase
  }

  const mtCols: MultiTableCols<T> = genColumnsWithExtProps(kTablesBase)
  const ktbs: KTables<T> = {
    columns: mtCols,
    tables: kTablesBase.tables,
    scopedColumns: {} as MultiTableCols<T>,
    aliasColumns: {} as MultiTableAliasCols<T>,
  }

  ktbs.scopedColumns = new Proxy(mtCols, {
    get(target: MultiTableCols<T>, tbAlias: string, receiver: unknown) {
      // eslint-disable-next-line no-console
      // console.log(`getting ${tbAlias.toString()}`)

      // @ts-ignore
      if (typeof target[tbAlias] === 'object' && target[tbAlias] !== null) {
        // @ts-ignore
        const tbCols = target[tbAlias]

        const cachedCols = getScopedColumnsColsCache(tbCols, tbAlias)
        /* istanbul ignore else */
        if (cachedCols) {
          return cachedCols
        }

        const scopedCols = createScopedColumns(tbCols, createColumnNameFn)
        setScopedColumnsColsCache(tbCols, tbAlias, scopedCols)

        return scopedCols
      }
      else {
        const data = Reflect.get(target, tbAlias, receiver)
        return data
      }
    },
    set() {
      return false
      // return Reflect.set(target, propKey, value, receiver)
    },
  })

  ktbs.aliasColumns = genAliasColumns(ktbs.scopedColumns)

  return ktbs
}


/**
 * Load kTables var from a js file
 */
export function loadVarFromFile<T extends TTables>(loadOpts: LoadVarFromFileOpts): KTables<T> {
  const { path, caller, options } = loadOpts
  const tbVarName = genVarName(options.exportVarPrefix, caller.line, caller.column)
  const tableVarName = `${tbVarName}_${DbPropKeys.tables}`

  const colSuffixArr = [DbPropKeys.columns, DbPropKeys.aliasColumns, DbPropKeys.scopedColumns]

  const ret = {} as KTables<T>
  const props = {
    configurable: false,
    enumerable: true,
    writable: false,
  }

  const mods = loadFile(path)

  if (! mods || typeof mods[tbVarName] !== 'object') {
    throw new TypeError(`Load tables failed, path: "${path}"`)
  }

  const tables = mods[tableVarName] as Tables<T>
  Object.defineProperty(ret, 'tables', {
    ...props,
    value: tables,
  })

  colSuffixArr.forEach((colName) => {
    const colVarName = `${tbVarName}${colName}`

    const columns = typeof mods[colVarName] === 'object'
      ? mods[colVarName] as MultiTableCols<T>
      : {} as MultiTableCols<T>

    Object.defineProperty(ret, colName, {
      ...props,
      value: columns,
    })
  })

  return ret
}

