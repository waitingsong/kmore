import {
  TableFields,
  DbCols,
  DbModel,
  DbAliasCols,
  TableAliasCols,
  KnexColumnsParma,
} from './model'
import { scopedSnakeToCamel } from './util'


export function genAliasColumns<D extends DbModel>(
  scopedColumns: DbCols<D>,
): DbAliasCols<D> {

  const ret = {} as DbAliasCols<D>

  Object.entries(scopedColumns).forEach((item) => {
    const tbAlias = item[0] as keyof D
    const cols = item[1] as TableFields<D>
    const tableFlds = {} as TableAliasCols

    Object.entries(cols).forEach((field) => {
      const [colAlias, scopedColName] = field
      // tb_user.uid -> tbUserUid
      const output = scopedSnakeToCamel(scopedColName)
      const value: KnexColumnsParma = {
        [output]: scopedColName,
      }

      Object.defineProperty(tableFlds, colAlias, {
        configurable: false,
        enumerable: true,
        writable: true,
        value,
      })
    })

    Object.defineProperty(ret, tbAlias, {
      configurable: false,
      enumerable: true,
      writable: true,
      value: tableFlds,
    })
  })

  return ret
}

