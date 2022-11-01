import assert from 'assert'

import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { genColumnMaping, patchWhereColumnAlias, splitScopedColumn } from './smart-join.helper.js'
import { KmorePageKey, SmartKey } from './types.js'


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

  // @ts-ignore
  // const queryContext = builder._queryContext as QueryContext | undefined
  // const caseConvert = queryContext?.postProcessResponseCaseConvert ?? CaseType.snake
  const tablesJoin = new Set([...builder._tablesJoin])
  const aliasMap = genColumnMaping(dbDict, tablesJoin)

  const aliasObject: Record<string, string> = {}
  aliasMap.forEach((col, alias) => {
    Object.defineProperty(aliasObject, alias, {
      ...defaultPropDescriptor,
      value: col,
    })
  })

  const pagingFlag = builder[KmorePageKey.PagingBuilderType]
  // conter query is not need to process
  if (! pagingFlag || pagingFlag === 'pager') {
    void builder.columns(aliasObject)
  }

  const ret = patchWhereColumnAlias(builder, aliasMap)
  return ret
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

