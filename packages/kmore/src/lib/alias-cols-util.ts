/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  TableFields,
  snakeToCamel,
  MultiTableScopedCols,
  ColumnExtPropKeys,
} from 'kmore-types'

import {
  TTables,
  MultiTableAliasColumns,
  JointTableColumns,
  ColAlias,
  KnexColumnsParma,
} from './model'


export function genAliasColumns<T extends TTables>(
  scopedColumns: MultiTableScopedCols<T>,
): MultiTableAliasColumns<T> {

  const ret = {} as MultiTableAliasColumns<T>

  Object.entries(scopedColumns).forEach((item) => {
    const tbAlias = item[0] as keyof T
    const cols = item[1] as TableFields<T, typeof tbAlias>
    const tableFlds = {} as JointTableColumns

    Object.entries(cols).forEach((row) => {
      const colAlias = row[0] as keyof T[typeof tbAlias]
      const scopedColName = row[1] as string
      const output = snakeToCamel(scopedColName.replace(/\./ug, '_'))

      const value: ColAlias<T[typeof tbAlias][typeof colAlias]> = {
        input: scopedColName,
        output,
        _typePlaceholder: void 0 as any,
      }

      Object.defineProperty(tableFlds, colAlias, {
        configurable: false,
        enumerable: true,
        writable: true,
        value,
      })

      Object.defineProperty(tableFlds, ColumnExtPropKeys.genFieldsAliasFn, {
        configurable: false,
        enumerable: false,
        writable: true,
        value: (keyArr: any[], useColAliasNameAsOutputName = false) => {
          return genKnexColumnsParam(tableFlds, keyArr, useColAliasNameAsOutputName)
        },
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


export function genKnexColumnsParam<T extends JointTableColumns = any>(
  jointTableColumns: T,
  keyArr: ((keyof T) | '*')[],
  useColAliasNameAsOutputName = false,
): KnexColumnsParma {

  const ret: KnexColumnsParma = {}

  if (keyArr.length && keyArr.includes('*')) {
    Object.keys(jointTableColumns).forEach((fldName) => {
      const { input, output } = jointTableColumns[fldName]
      if (! input || ! output) {
        throw new Error('Invalie in and out value')
      }
      const key = useColAliasNameAsOutputName === true ? fldName : output
      updateProps(ret, key, input)
    })
  }
  else {
    keyArr.forEach((fldName) => {
      const { input, output } = jointTableColumns[fldName]
      if (! input || ! output) {
        throw new Error('Invalie in and out value')
      }
      const key = useColAliasNameAsOutputName === true ? fldName : output
      updateProps(ret, key, input)
    })
  }

  return ret
}

function updateProps<T extends JointTableColumns = any>(
  obj: KnexColumnsParma,
  key: keyof T,
  value: string,
): void {

  Object.defineProperty(obj, key, {
    configurable: false,
    enumerable: true,
    writable: true,
    value,
  })
}

