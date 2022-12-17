import assert from 'assert'

import { snakeToCamel } from '@waiting/shared-core'
import type { DbDict } from 'kmore-types'

import type { KmoreQueryBuilder } from './builder.types.js'


export function genColumnMaping(
  dbDict: DbDict<unknown>,
  tablesJoin: Set<string>,
): Map<string, string> {

  const aliasMap = new Map<string, string>()

  tablesJoin.forEach((tableName: string) => {
    // @ts-ignore
    const scopedCols = dbDict.scoped[tableName]
    if (typeof scopedCols === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Object.entries(scopedCols).forEach(([colName, col]) => {
        if (typeof col !== 'string') { return }

        if (aliasMap.has(colName)) {
          const colName2 = col.replace(/\./ug, '_')
          aliasMap.set(colName2, col)
        }
        else {
          aliasMap.set(colName, col)
        }
      })
    }
  })

  // @TODO: pascal case

  return aliasMap
}


export function splitScopedColumn(input: string): [string, string] {
  const arr = input.split('.')
  const tableName = arr.slice(0, -1).join('.')
  const col = arr.at(-1)
  assert(tableName)
  assert(col)
  return [tableName, col]
}


export function patchWhereColumnAlias(
  builder: KmoreQueryBuilder,
  aliasMap: Map<string, string> = new Map(),
): KmoreQueryBuilder {

  if (! aliasMap.size) {
    return builder
  }

  const { dbDict } = builder
  assert(dbDict, 'builder.dict undefined')

  const { dbId, kmoreQueryId, caseConvert } = builder

  const camelMap = new Map<string, string>()
  aliasMap.forEach((col, alias) => {
    const camelKey = snakeToCamel(alias)
    if (camelKey !== alias) {
      camelMap.set(camelKey, col)
    }
  })

  // @ts-ignore
  const statements = builder._statements
  if (Array.isArray(statements) && statements.length) {
    statements.forEach((statement) => {
      if (statement.grouping !== 'where') { return }
      // if (statement.asColumn) { return }

      const { column } = statement
      if (! column || typeof column !== 'string') { return }

      const scoped = aliasMap.get(column)
      if (scoped) {
        if (column === scoped) { return }
        statement.column = scoped
        return
      }

      const scoped2 = camelMap.get(column)
      if (scoped2) {
        if (column === scoped2) { return }
        statement.column = scoped2
        return
      }

      // @ts-expect-error
      const method = builder._method as string
      const tablesJoin = builder._tablesJoin as string[]
      console.info(`[Kmore]: patchWhereColumnAlias() column mapping not found: ${column}, will keep original`, {
        dbId,
        kmoreQueryId,
        caseConvert,
        method,
        tablesJoin,
        statement,
      })
    })

  }

  return builder
}
