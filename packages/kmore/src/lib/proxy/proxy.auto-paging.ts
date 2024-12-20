import assert from 'node:assert'

import { context } from '@opentelemetry/api'

import type { KmoreQueryBuilder } from '../builder/builder.types.js'
import { defaultPropDescriptor } from '../config.js'
import type { PageWrapType, PagingMeta, PagingOptions } from '../paging.types.js'
import { KmorePageKey } from '../types.js'


export const initPagingOptions: _PagingOptions = {
  enable: true,
  page: 1,
  pageSize: 10,
  wrapOutput: false,
}

export const initPagingMeta: PagingMeta = {
  total: 0n,
  page: 1,
  pageSize: initPagingOptions.pageSize,
}

export const initPageTypeMapping: Record<keyof PageWrapType, string> = {
  total: 'total',
  page: 'page',
  pageSize: 'pageSize',
  rows: 'rows',
}

export interface _PagingOptions extends PagingOptions {
  wrapOutput: boolean
}

export function extRefTableFnPropertyAutoPaging(refTable: KmoreQueryBuilder, enableTrace: boolean): void {
  assert(
    typeof refTable[KmorePageKey.AutoPaging] !== 'function',
    'extRefTableFnPropertyAutoPaging() can only be called once',
  )

  void Object.defineProperty(refTable, KmorePageKey.AutoPaging, {
    ...defaultPropDescriptor,
    writable: true,
    // value: (
    //   options?: Partial<PagingOptions>,
    //   wrapOutput?: boolean,
    // ) => autoPagingBuilder(options, wrapOutput ?? false, refTable),
    value: (
      options?: Partial<PagingOptions>,
      wrapOutput?: boolean,
    ) => {
      if (enableTrace) {
        return context.with(context.active(), () => autoPagingBuilder(options, wrapOutput ?? false, refTable))
      }
      return autoPagingBuilder(options, wrapOutput ?? false, refTable)
    },
  })
}

function autoPagingBuilder(
  options: Partial<PagingOptions> | undefined,
  wrapOutput: boolean,
  queryBuilder: KmoreQueryBuilder,
): KmoreQueryBuilder {

  const pagingOptions = Object.getOwnPropertyDescriptor(queryBuilder, KmorePageKey.PagingOptions)?.value as _PagingOptions | undefined

  assert(! pagingOptions?.enable, 'autoPaging() can be called only once')

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

