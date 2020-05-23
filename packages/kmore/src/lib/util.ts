import {
  validateParamTables,
  createNullObject,
  KTablesBase,
  MultiTableCols,
  LoadVarFromFileOpts,
  genVarName,
  loadFile,
  Tables,
  Columns,
} from 'kmore-types'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as Knex from 'knex'

import { genAliasColumns } from './alias-cols-util'
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

  const rb = createNullObject() as DbRefBuilder<T>

  Object.defineProperty(db, DbPropKeys.refTables, {
    ...propDescriptor,
    value: rb,
  })

  Object.keys(db.tables).forEach((refName) => {
    Object.defineProperty(rb, refName, {
      ...propDescriptor,
      value: (): Knex.QueryBuilder => db.dbh(refName),
    })
    Object.defineProperty(rb[refName as keyof typeof rb], 'name', {
      ...propDescriptor,
      value: `${options.refTablesPrefix}${refName}`,
    })
  })

  return db
}

export function hasExtColumns<T extends TTables>(
  tables: KTablesBase<T> | KTables<T>,
  key: DbPropKeys,
): tables is KTables<T> {

  return !! Object.prototype.hasOwnProperty.call(tables, key)
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

  if (hasExtColumns(kTablesBase, DbPropKeys.aliasColumns)
    && hasExtColumns(kTablesBase, DbPropKeys.scopedColumns)) {
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
    get(target: MultiTableCols<T>, tbAlias: keyof Columns<T>, receiver: unknown) {
      // eslint-disable-next-line no-console
      // console.log(`getting ${tbAlias.toString()}`)

      // @ts-expect-error
      const tbCols = target[tbAlias] as unknown // as Columns<T>

      if (typeof tbCols === 'object' && !! tbCols) {
        const tbCols2 = tbCols as Columns<T>
        const cachedCols = getScopedColumnsColsCache<T>(tbCols2, tbAlias as string)
        /* istanbul ignore else */
        if (cachedCols) {
          return cachedCols
        }

        const scopedCols = createScopedColumns(tbCols2, createColumnNameFn)
        setScopedColumnsColsCache(tbCols2, tbAlias as string, scopedCols)

        return scopedCols
      }
      else {
        const data = Reflect.get(target, tbAlias, receiver) as unknown
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
export function loadKTablesVarFromFile<T extends TTables>(loadOpts: LoadVarFromFileOpts): KTables<T> {
  const { path, caller, options } = loadOpts
  const tbVarName = genVarName(options.exportVarPrefix, caller.line, caller.column)

  const keySuffixArr = [
    DbPropKeys.tables,
    DbPropKeys.columns,
    DbPropKeys.aliasColumns,
    DbPropKeys.scopedColumns,
  ]

  const ret = {} as KTables<T>
  const props = {
    configurable: false,
    enumerable: true,
    writable: false,
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mods = loadFile(path)

  const tKey = `${tbVarName}_${DbPropKeys.tables}`
  if (! mods || ! Object.getOwnPropertyDescriptor(mods, tKey)) {
    throw new TypeError(`Error, load tables failed, key not existed: "${tKey}", path: "${path}"`)
  }

  keySuffixArr.forEach((key) => {
    const varName = `${tbVarName}_${key}`

    const value = Object.getOwnPropertyDescriptor(mods, varName)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ? mods[varName] as Tables<T> | MultiTableCols<T>
      : {} as Tables<T> | MultiTableCols<T>

    Object.defineProperty(ret, key, {
      ...props,
      value,
    })
  })

  return ret
}

