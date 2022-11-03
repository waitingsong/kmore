import assert from 'assert'

import { KmoreQueryBuilder, PagingMeta, PagingOptions } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { KmorePageKey } from './types.js'


export const initPagingOptions: PagingOptions = {
  enable: true,
  page: 1,
  pageSize: 10,
}

export const initPagingMeta: PagingMeta = {
  total: 0,
  page: 1,
  pageSize: initPagingOptions.pageSize,
}

export function extRefTableFnPropertyAutoPaging(refTable: KmoreQueryBuilder): KmoreQueryBuilder {
  assert(
    typeof refTable[KmorePageKey.AutoPaging] !== 'function',
    'extRefTableFnPropertyAutoPaging() can only be called once',
  )

  void Object.defineProperty(refTable, KmorePageKey.AutoPaging, {
    ...defaultPropDescriptor,
    writable: true,
    value: (options: Partial<PagingOptions>) => autoPagingBuilder(options, refTable),
  })

  return refTable as KmoreQueryBuilder
}

function autoPagingBuilder(
  options: Partial<PagingOptions>,
  queryBuilder: KmoreQueryBuilder,
): KmoreQueryBuilder {

  if (Object.hasOwn(queryBuilder, KmorePageKey.PagingOptions)) {
    throw new Error('autoPaging() can only be called once')
  }

  const opts: PagingOptions = {
    ...initPagingOptions,
    ...options,
  }
  assert(opts.page > 0, 'AutoPagingOptions page should be greater than 0')
  assert(opts.pageSize > 0, 'AutoPagingOptions pageSize should be greater than 0')

  opts.page = Math.round(opts.page)
  opts.pageSize = Math.round(opts.pageSize)

  assert(Number.isSafeInteger(opts.page), 'AutoPagingOptions pageIndex should be a safe integer')
  assert(Number.isSafeInteger(opts.pageSize), 'AutoPagingOptions pageSize should be a safe integer')

  void Object.defineProperty(queryBuilder, KmorePageKey.PagingOptions, {
    ...defaultPropDescriptor,
    writable: true,
    value: opts,
  })

  return queryBuilder
}

