/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  ColumnExtPropKeys,
  MultiTableCols,
  Columns,
  KTablesBase,
  ScopedColumns,
} from 'kmore-types'

import {
  TTables,
  KTables,
  CreateColumnNameOpts,
  CreateColumnNameFn,
} from './model'
import { hasScopedColumns } from './util'


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

  const colsNew: MultiTableCols<T> = genColumnsWithExtProps(kTablesBase)
  const ktbs: KTables<T> = {
    columns: colsNew,
    tables: kTablesBase.tables,
    scopedColumns: {} as MultiTableCols<T>,
  }

  ktbs.scopedColumns = new Proxy(colsNew, {
    get(target: MultiTableCols<T>, tbAlias: string, receiver: unknown) {
      // eslint-disable-next-line no-console
      // console.log(`getting ${tbAlias.toString()}`)

      // @ts-ignore
      if (typeof target[tbAlias] === 'object' && target[tbAlias] !== null) {
        // @ts-ignore
        const columns = target[tbAlias] as Columns<T>

        const cachedCols = getScopedColumnsColsCache(columns, tbAlias)
        /* istanbul ignore else */
        if (cachedCols) {
          return cachedCols
        }

        const scopedCols = createScopedColumns(columns, createColumnNameFn)
        setScopedColumnsColsCache(columns, tbAlias, scopedCols)

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

  return ktbs
}

function genColumnsWithExtProps<T extends TTables>(
  kTablesBase: KTablesBase<T>,
): KTablesBase<T>['columns'] {

  const ret = {} as KTablesBase<T>['columns']
  const props = {
    configurable: false,
    enumerable: true,
    writable: true,
  }

  Object.keys(kTablesBase.columns).forEach((tbAlias) => {
    const alias = tbAlias as keyof KTablesBase<T>['columns']
    const cols = kTablesBase.columns[alias]

    const retCols = createColumnsProperties({
      // @ts-ignore
      columns: cols,
      tableAlias: tbAlias,
      tables: kTablesBase.tables,
    })
    Object.defineProperty(ret, tbAlias, {
      ...props,
      value: retCols,
    })
  })

  return ret
}

function createColumnsProperties<T extends TTables>(options: {
  columns: Columns<T>,
  tableAlias: string,
  tables: KTablesBase<T>['tables'],
}): Columns<T> {

  const props = {
    configurable: false,
    enumerable: false,
    writable: false,
  }
  const { tableAlias, tables } = options
  const cols = options.columns

  if (typeof cols[ColumnExtPropKeys.tableAlias] === 'undefined') {
    Object.defineProperty(cols, ColumnExtPropKeys.tableAlias, {
      ...props,
      value: tableAlias,
    })
  }

  if (typeof cols[ColumnExtPropKeys.tablesRef] === 'undefined') {
    Object.defineProperty(cols, ColumnExtPropKeys.tablesRef, {
      ...props,
      value: tables,
    })
  }

  if (typeof cols[ColumnExtPropKeys.sColsCacheMap] === 'undefined') {
    Object.defineProperty(cols, ColumnExtPropKeys.sColsCacheMap, {
      value: new Map(),
    })
  }

  return cols
}

function getScopedColumnsColsCache<T extends TTables>(
  columns: Columns<T>,
  tableAlias: string,
): ScopedColumns<T> | void {

  const cacheMap = columns[ColumnExtPropKeys.sColsCacheMap]
  /* istanbul ignore else */
  if (! cacheMap) {
    // throw new TypeError('Invalid colsCacheMap')
    return
  }
  return cacheMap.get(tableAlias)
}

function setScopedColumnsColsCache<T extends TTables>(
  columns: Columns<T>,
  tableAlias: string,
  scopedColumns: ScopedColumns<T>,
): void {

  const cacheMap = columns[ColumnExtPropKeys.sColsCacheMap]
  /* istanbul ignore else */
  if (! cacheMap) {
    throw new TypeError('Invalid colsCacheMap')
  }
  /* istanbul ignore else */
  if (scopedColumns && Object.keys(scopedColumns).length) {
    cacheMap.set(tableAlias, scopedColumns)
  }
}

function createScopedColumns<T extends TTables>(
  columns: Columns<T>,
  /** false will use original col name w/o table name prefix */
  createColumnNameFn: CreateColumnNameFn | false = defaultCreateScopedColumnName,
): ScopedColumns<T> {

  const scopedCols = new Proxy(columns, {
    get(targetCol: ScopedColumns<T>, colAlias: string, receiver2: unknown) {
      // @ts-ignore
      const runTimeTbAlias = Reflect.get(targetCol, ColumnExtPropKeys.tableAlias, receiver2)
      // @ts-ignore
      const tbsRef = Reflect.get(targetCol, ColumnExtPropKeys.tablesRef, receiver2)
      const tbName = tbsRef[runTimeTbAlias]

      if (typeof tbName === 'string' && tbName) {
        const colName: string = Reflect.get(targetCol, colAlias, receiver2)
        if (typeof createColumnNameFn === 'function') {
          return createColumnNameFn({
            tableName: tbName,
            columnName: colName,
          })
        }
        else if (createColumnNameFn === false) {
          return colName // no parse
        }
        else {
          throw new TypeError('Parameter createColumnNameFn must be Function or false')
        }
      }
      else {
        throw new TypeError(`Invalid proxy parameter value of colAlias: "${colAlias}"`)
      }
    },
    set() {
      return false
    },
  })

  return scopedCols
}

function defaultCreateScopedColumnName(options: CreateColumnNameOpts): string {
  const { tableName, columnName } = options
  return `${tableName}.${columnName}`
}

