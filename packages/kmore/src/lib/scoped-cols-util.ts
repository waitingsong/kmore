/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  ColumnExtPropKeys,
  Columns,
  KTablesBase,
  ScopedColumns,
  TableAlias,
} from 'kmore-types'

import {
  TTables,
  CreateColumnNameOpts,
  CreateColumnNameFn,
} from './model'


export function genColumnsWithExtProps<T extends TTables>(
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
      // @ts-expect-error
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

export function getScopedColumnsColsCache<T extends TTables>(
  columns: Columns<T>,
  tableAlias: string,
): ScopedColumns<T> | undefined {

  const cacheMap = columns[ColumnExtPropKeys.sColsCacheMap]
  return cacheMap.get(tableAlias)
}

export function setScopedColumnsColsCache<T extends TTables>(
  columns: Columns<T>,
  tableAlias: string,
  scopedColumns: ScopedColumns<T>,
): void {

  const cacheMap = columns[ColumnExtPropKeys.sColsCacheMap]
  /* istanbul ignore else */
  if (Object.keys(scopedColumns).length) {
    cacheMap.set(tableAlias, scopedColumns)
  }
}

export function createScopedColumns<T extends TTables>(
  columns: Columns<T>,
  /** false will use original col name w/o table name prefix */
  createColumnNameFn: CreateColumnNameFn | false = defaultCreateScopedColumnName,
): ScopedColumns<T> {

  const scopedCols = new Proxy(columns, {
    get(targetCol: ScopedColumns<T>, colAlias: string, receiver2: unknown) {
      const runTimeTbAlias = Reflect.get(targetCol, ColumnExtPropKeys.tableAlias, receiver2) as TableAlias
      const tbsRef = Reflect.get(
        targetCol,
        ColumnExtPropKeys.tablesRef,
        receiver2,
      ) as Columns<T>[ColumnExtPropKeys.tablesRef]
      // @ts-expect-error
      const tbName = tbsRef[runTimeTbAlias] as unknown

      if (typeof tbName === 'string' && tbName) {
        const colName = Reflect.get(targetCol, colAlias, receiver2) as string
        if (typeof createColumnNameFn === 'function') {
          return createColumnNameFn({
            tableName: tbName,
            columnName: colName,
          })
        }
        else {
          return colName // no parse
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

export function defaultCreateScopedColumnName(options: CreateColumnNameOpts): string {
  const { tableName, columnName } = options
  return `${tableName}.${columnName}`
}

