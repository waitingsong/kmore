import { defaultCreateScopedColumnName } from './config'
import {
  DbDictBase,
  DbCols,
  TableAlias,
  TableFields,
  DbModel,
  CreateColumnNameFn,
} from './model'


/**
 *
 * @returns - DbCols<T> ```
 * {
 *  tb_user: {
 *    uid: "tb_user.uid",
 *    name: "tb_user.name",
 *  },
 *  tb_user_detail: {...},
 * }
 * ```
 */
export function genDbScopedCols<D extends DbModel>(
  dbDictBase: DbDictBase<D>,
  /** false will use original col name w/o table name prefix */
  createColumnNameFn: CreateColumnNameFn | false = defaultCreateScopedColumnName,
): DbCols<D> {

  const ret = {} as DbCols<D>

  const props = {
    configurable: false,
    enumerable: true,
    writable: false,
  }

  const { tables, columns } = dbDictBase

  Object.entries(columns).forEach((tb: [TableAlias, TableFields<D[keyof D]>]) => {
    const [tbAlias, tbFields] = tb
    const tableName = tables[tbAlias]
    const tmpTableFields = {} as TableFields<D[keyof D]>

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

