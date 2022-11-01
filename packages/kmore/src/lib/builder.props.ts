import assert from 'assert'

import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { CaseType } from './types.js'


export function createBuilderProperties(
  refTable: KmoreQueryBuilder,
  caseConvert: CaseType,
  kmoreQueryId: symbol,
  dict: unknown,
): KmoreQueryBuilder {

  assert(caseConvert, 'caseConvert must be defined')

  void Object.defineProperty(refTable, 'kmoreQueryId', {
    ...defaultPropDescriptor,
    value: kmoreQueryId,
  })

  void Object.defineProperty(refTable, 'dbDict', {
    ...defaultPropDescriptor,
    value: dict,
  })

  void Object.defineProperty(refTable, '_tablesJoin', {
    ...defaultPropDescriptor,
    value: [],
  })

  void Object.defineProperty(refTable, 'caseConvert', {
    ...defaultPropDescriptor,
    value: caseConvert,
  })

  return refTable
}

