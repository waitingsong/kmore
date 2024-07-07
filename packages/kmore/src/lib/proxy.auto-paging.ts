import assert from 'assert'

import type { KmoreQueryBuilder, PageWrapType, PagingMeta, PagingOptions } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { KmorePageKey } from './types.js'


export const initPagingOptions: _PagingOptions = {
  enable: true,
  page: 1,
  pageSize: 10,
  wrapOutput: false,
}

export const initPagingMeta: PagingMeta = {
  total: 0,
  page: 1,
  pageSize: initPagingOptions.pageSize,
}

export const initPageTypeMaping: Record<keyof PageWrapType, string> = {
  total: 'total',
  page: 'page',
  pageSize: 'pageSize',
  rows: 'rows',
}

export interface _PagingOptions extends PagingOptions {
  wrapOutput: boolean
}

export function extRefTableFnPropertyAutoPaging(refTable: KmoreQueryBuilder): KmoreQueryBuilder {
  assert(
    typeof refTable[KmorePageKey.AutoPaging] !== 'function',
    'extRefTableFnPropertyAutoPaging() can only be called once',
  )

  void Object.defineProperty(refTable, KmorePageKey.AutoPaging, {
    ...defaultPropDescriptor,
    writable: true,
    value: (
      options?: Partial<PagingOptions>,
      wrapOutput?: boolean,
    ) => autoPagingBuilder(options, wrapOutput ?? false, refTable),
  })

  return refTable
}

function autoPagingBuilder(
  options: Partial<PagingOptions> | undefined,
  wrapOutput: boolean,
  queryBuilder: KmoreQueryBuilder,
): KmoreQueryBuilder {

  if (Object.hasOwn(queryBuilder, KmorePageKey.PagingOptions)) {
    throw new Error('autoPaging() can only be called once')
  }

  const opts: _PagingOptions = {
    ...initPagingOptions,
    ...options,
  }
  if (wrapOutput) {
    opts.wrapOutput = true
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

