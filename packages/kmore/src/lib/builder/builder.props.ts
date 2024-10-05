import assert from 'node:assert'

import type { ScopeType } from '@mwcp/share'

import { defaultPropDescriptor } from '../config.js'
import type { PagingOptions } from '../paging.types.js'
import { initPagingOptions } from '../proxy/proxy.auto-paging.js'
import { type CaseType, KmorePageKey } from '../types.js'

import type { KmoreQueryBuilder } from './builder.types.js'
import { QueryBuilderExtKey } from './builder.types.js'


export function updateBuilderProperties(
  refTable: KmoreQueryBuilder,
  caseConvert: CaseType,
  kmoreQueryId: symbol,
  dict: unknown,
  dbId: string,
  scope: ScopeType | undefined,
): void {

  assert(caseConvert, 'caseConvert must be defined')

  const pagingOpts: PagingOptions = {
    ...initPagingOptions,
    enable: false,
  }
  void Object.defineProperty(refTable, KmorePageKey.PagingOptions, {
    ...defaultPropDescriptor,
    writable: true,
    value: pagingOpts,
  })

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

  void Object.defineProperty(refTable, QueryBuilderExtKey.callerKey, {
    ...defaultPropDescriptor,
    writable: true,
    value: '',
  })

  void Object.defineProperty(refTable, QueryBuilderExtKey.scope, {
    ...defaultPropDescriptor,
    writable: true,
    value: scope,
  })
}

