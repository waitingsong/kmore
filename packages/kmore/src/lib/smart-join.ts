import assert from 'assert'

import { defaultPropDescriptor } from './config.js'
import { KmoreQueryBuilder, SmartKey } from './types.js'


export function processJoinTableColumnAlias(
  builder: KmoreQueryBuilder,
): KmoreQueryBuilder {

  if (! builder._tablesJoin.length) {
    return builder
  }

  const { dbDict } = builder
  if (! dbDict || Object.keys(dbDict).length < 2) {
    return builder
  }

  const aliasMap = new Map<string, string>()
  const tablesJoin = new Set([...builder._tablesJoin])

  tablesJoin.forEach((tableName) => {
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


  const aliasObject: Record<string, string> = {}
  aliasMap.forEach((col, alias) => {
    Object.defineProperty(aliasObject, alias, {
      ...defaultPropDescriptor,
      value: col,
    })
  })

  void builder.columns(aliasObject)
  const ret = patchWhereColumnAlias(builder, aliasMap)
  return ret
}

function patchWhereColumnAlias(
  builder: KmoreQueryBuilder,
  aliasMap: Map<string, string> = new Map(),
): KmoreQueryBuilder {

  if (! aliasMap.size) {
    return builder
  }

  // @ts-ignore
  const statements = builder._statements
  if (Array.isArray(statements) && statements.length) {
    statements.forEach((statement) => {
      if (statement.grouping !== 'where') { return }
      // if (statement.asColumn) { return }

      const { column } = statement
      if (! column || typeof column !== 'string') { return }

      const scoped = aliasMap.get(column)
      if (! scoped || column === scoped) { return }
      statement.column = scoped
    })

  }

  return builder
}


export function extRefTableFnPropertySmartJoin(
  refTable: KmoreQueryBuilder,
): KmoreQueryBuilder {

  Object.values(SmartKey).forEach((joinType) => {
    if (typeof refTable[joinType] === 'function') { return }

    void Object.defineProperty(refTable, joinType, {
      ...defaultPropDescriptor,
      value: (
        scopedColumnBeJoined: string,
        scopedColumn: string,
      ) => smartJoinBuilder(refTable, joinType, scopedColumnBeJoined, scopedColumn),
    })
  })

  return refTable as KmoreQueryBuilder
}

function smartJoinBuilder(
  queryBuilder: KmoreQueryBuilder,
  joinType: SmartKey,
  scopedColumnBeJoined: string,
  scopedColumn: string,
): KmoreQueryBuilder {

  assert(scopedColumnBeJoined, 'scopedColumnBeJoined must be defined')
  assert(scopedColumn, 'scopedColumnDrive must be defined')

  const [tableName2] = splitScopedColumn(scopedColumnBeJoined)
  const [tableName1] = splitScopedColumn(scopedColumn)
  queryBuilder._tablesJoin.push(tableName1, tableName2)

  let ret: unknown
  switch (joinType) {
    case SmartKey.join:
      ret = queryBuilder.join(tableName2, scopedColumnBeJoined, scopedColumn)
      break

    case SmartKey.leftJoin:
      ret = queryBuilder.leftJoin(tableName2, scopedColumnBeJoined, scopedColumn)
      break

    case SmartKey.rightJoin:
      ret = queryBuilder.rightJoin(tableName2, scopedColumnBeJoined, scopedColumn)
      break

    case SmartKey.innerJoin:
      ret = queryBuilder.innerJoin(tableName2, scopedColumnBeJoined, scopedColumn)
      break

    case SmartKey.crossJoin:
      ret = queryBuilder.crossJoin(tableName2, scopedColumnBeJoined, scopedColumn)
      break

  }

  return ret as KmoreQueryBuilder
}




function splitScopedColumn(input: string): [string, string] {
  const arr = input.split('.')
  const tableName = arr.slice(0, -1).join('.')
  const col = arr.at(-1)
  assert(tableName)
  assert(col)
  return [tableName, col]
}


