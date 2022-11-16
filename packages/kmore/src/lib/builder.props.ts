import assert from 'assert'

import { KmoreQueryBuilder, QueryBuilderExtKey } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { CaseType } from './types.js'


export function createBuilderProperties(
  refTable: KmoreQueryBuilder,
  caseConvert: CaseType,
  kmoreQueryId: symbol,
  dict: unknown,
  dbId: string,
): KmoreQueryBuilder {

  assert(caseConvert, 'caseConvert must be defined')

  void Object.defineProperty(refTable, QueryBuilderExtKey.kmoreQueryId, {
    ...defaultPropDescriptor,
    value: kmoreQueryId,
  })

  void Object.defineProperty(refTable, QueryBuilderExtKey.dbDict, {
    ...defaultPropDescriptor,
    value: dict,
  })

  void Object.defineProperty(refTable, QueryBuilderExtKey.tablesJoin, {
    ...defaultPropDescriptor,
    value: [],
  })

  void Object.defineProperty(refTable, QueryBuilderExtKey.caseConvert, {
    ...defaultPropDescriptor,
    value: caseConvert,
  })

  assert(dbId, 'dbId must be defined')
  void Object.defineProperty(refTable, QueryBuilderExtKey.dbId, {
    ...defaultPropDescriptor,
    value: dbId,
  })

  return refTable
}

