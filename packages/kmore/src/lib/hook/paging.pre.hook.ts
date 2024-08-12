import assert from 'node:assert'

import { builderBindEvents } from '##/lib/builder/builder.event.js'
import { UpdateBuilderProperties } from '##/lib/builder/builder.props.js'
import type { KmoreQueryBuilder } from '##/lib/builder/builder.types.js'
import { extRefTableFnPropertySmartJoin } from '##/lib/builder/smart-join.js'
import { defaultPropDescriptor } from '##/lib/config.js'
import type { Kmore } from '##/lib/kmore.js'
import type { PagingOptions } from '##/lib/paging.types.js'
import { initPagingOptions, type _PagingOptions } from '##/lib/proxy/proxy.auto-paging.js'
import { createQueryBuilderProxy } from '##/lib/proxy/proxy.index.js'
import { KmoreBuilderType, KmorePageKey } from '##/lib/types.js'
import { genKmoreTrxId } from '##/lib/util.js'

import { createProxyTransacting } from '../proxy/proxy.transacting.js'

import type { BuilderHookOptions } from './hook.types.js'


// #region Pre Processor

export async function pagingPreProcessor(options: BuilderHookOptions): Promise<BuilderHookOptions> {
  const { total, builderPager } = await genBuilderForPaging(options)
  if (! total || ! builderPager) {
    return options
  }
  const opts = { ...options, builder: builderPager }

  createQueryBuilderProxy(opts)
  // const builderPagerSql = builderPagerPatched.toQuery()
  // console.info({ builderPageSql: builderPagerSql })
  return opts
}


interface GenBuilderForPagingRetType {
  total: bigint
  pagingOptions: _PagingOptions
  builderPager?: KmoreQueryBuilder | undefined
}

async function genBuilderForPaging(options: BuilderHookOptions): Promise<GenBuilderForPagingRetType> {
  const { kmore, builder } = options
  const pagingOptions = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingOptions)?.value as _PagingOptions
  if (! pagingOptions.enable) {
    return { total: 0n, pagingOptions }
  }

  assert(
    ! Object.hasOwn(builder, KmorePageKey.PagingProcessed),
    'Paging already processed',
  )

  // @ts-ignore
  const method = builder._method as string
  assert(
    method === 'select',
    'autoPaging() can only be called on SELECT queries, first() is not supported with autoPaging()'
    + ` method: ${method}`,
  )

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  // const pagingOptions: _PagingOptions = builder[KmorePageKey.PagingOptions]
  assert(pagingOptions, 'pagingOptions should be set')
  void Object.defineProperty(builder, KmorePageKey.PagingProcessed, {
    ...defaultPropDescriptor,
    value: true,
  })

  const builderPager = cloneBuilder(kmore, builder)
  void Object.defineProperty(builderPager, KmorePageKey.PagingBuilderType, {
    ...defaultPropDescriptor,
    value: KmoreBuilderType.pager,
  })

  const pagingOpts: PagingOptions = {
    ...initPagingOptions,
    ...pagingOptions,
  }
  void Object.defineProperty(builderPager, KmorePageKey.PagingOptions, {
    ...defaultPropDescriptor,
    value: pagingOpts,
  })

  // const queryCtxOpts: QueryContext = {
  //   wrapIdentifierCaseConvert: kmore.wrapIdentifierCaseConvert,
  //   postProcessResponseCaseConvert: caseConvert,
  //   kmoreQueryId,
  // }

  const builderCounter = builder
    .clearCounters()
    .clearGroup()
    .clearHaving()
    .clearOrder()
    .clearSelect()
    .count({ total: '*' })
    .limit(1)
  // const builderCounterSql = builderCounter.toQuery()
  // console.info({ builderCounterSql })

  void Object.defineProperty(builderCounter, KmorePageKey.PagingOptions, {
    ...defaultPropDescriptor,
    value: {
      ...pagingOpts,
      enable: false,
    },
  })
  void Object.defineProperty(builderCounter, KmorePageKey.PagingBuilderType, {
    ...defaultPropDescriptor,
    writable: true,
    value: KmoreBuilderType.counter,
  })


  const total = await builderCounter
    .then((rows: { total?: number | string, [k: string]: unknown }[]) => {
      assert(Array.isArray(rows), 'rows should be an array, which is the result of count query of autoPaging')
      if (rows.length > 0) {
        const [row] = rows
        if (row?.total) {
          return BigInt(row.total)
        }
      }
      return 0n
    })

  void Object.defineProperty(builder, KmorePageKey.PagingMetaTotal, {
    ...defaultPropDescriptor,
    value: total,
  })

  const ret: GenBuilderForPagingRetType = {
    total,
    pagingOptions,
  }

  if (! total) {
    void Object.defineProperty(builder, KmorePageKey.PagingBuilderType, {
      ...defaultPropDescriptor,
      value: KmoreBuilderType.pager,
    })
    return ret
  }

  const offset = pagingOptions.pageSize * (pagingOptions.page - 1)

  const b3 = builderPager
    .limit(pagingOptions.pageSize)
    .offset(offset >= 0 ? offset : 0) as unknown as KmoreQueryBuilder

  void Object.defineProperty(builderPager, KmorePageKey.PagingMetaTotal, {
    ...defaultPropDescriptor,
    value: total,
  })

  ret.builderPager = b3
  return ret
}


function cloneBuilder(
  kmore: Kmore,
  builder: KmoreQueryBuilder,
): KmoreQueryBuilder {

  const { caseConvert, kmoreQueryId, dbDict } = builder
  assert(kmoreQueryId, 'kmoreQueryId should be set on QueryBuilder')

  const kmoreQueryId2 = genKmoreTrxId(kmoreQueryId, '-pager')

  let builderPager = builder.clone() as KmoreQueryBuilder
  UpdateBuilderProperties(
    builderPager,
    caseConvert,
    kmoreQueryId2,
    dbDict,
    kmore.dbId,
  )
  builderPager = builderBindEvents({
    kmore,
    builder: builderPager,
    caseConvert,
  })
  createProxyTransacting({ kmore, builder: builderPager })
  extRefTableFnPropertySmartJoin(builderPager)

  const trx = kmore.getTrxByQueryId(kmoreQueryId)
  if (trx) {
    void builderPager.transacting(trx)
  }

  return builderPager
}

