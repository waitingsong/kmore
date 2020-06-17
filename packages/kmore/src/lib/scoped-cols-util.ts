import {
  KTablesBase,
  MultiTableCols,
  TableAlias,
  TableFields,
} from 'kmore-types'

import {
  TTables,
  CreateColumnNameOpts,
  CreateColumnNameFn,
} from './model'


/**
 *
 * @returns - MultiTableCols<T> ```
 * {
 *  tb_user: {
 *    uid: "tb_user.uid",
 *    name: "tb_user.name",
 *  },
 *  tb_user_detail: {...},
 * }
 * ```
 */
export function genMultiTableScopedCols<T extends TTables>(
  kTablesBase: KTablesBase<T>,
  /** false will use original col name w/o table name prefix */
  createColumnNameFn: CreateColumnNameFn | false = defaultCreateScopedColumnName,
): MultiTableCols<T> {

  const ret = {} as MultiTableCols<T>

  const props = {
    configurable: false,
    enumerable: true,
    writable: false,
  }

  const { tables, columns } = kTablesBase

  Object.entries(columns).forEach((tb: [TableAlias, TableFields<T[keyof T]>]) => {
    const [tbAlias, tbFields] = tb
    const tableName = tables[tbAlias]
    const tmpTableFields = {} as TableFields<T[keyof T]>

    Object.entries(tbFields).forEach((field: [string, string]) => {
      const [colKey, columnName] = field
      let value = columnName

      if (typeof createColumnNameFn === 'function') {
        value = createColumnNameFn({
          tableName,
          columnName,
        })
      }
      Object.defineProperty(tmpTableFields, colKey, {
        ...props,
        value,
      })
    })

    Object.defineProperty(ret, tbAlias, {
      ...props,
      value: tmpTableFields,
    })
  })

  return ret
}


export function defaultCreateScopedColumnName(options: CreateColumnNameOpts): string {
  const { tableName, columnName } = options
  return `${tableName}.${columnName}`
}

