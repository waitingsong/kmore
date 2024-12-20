import assert from 'node:assert'

import { builderBindEvents } from '##/lib/builder/builder.event.js'
import { updateBuilderProperties } from '##/lib/builder/builder.props.js'
import type { KmoreQueryBuilder } from '##/lib/builder/builder.types.js'
import { extRefTableFnPropertySmartJoin } from '##/lib/builder/smart-join.js'
import { defaultPropDescriptor } from '##/lib/config.js'
import type { Kmore } from '##/lib/kmore.js'
import type { PagingOptions } from '##/lib/paging.types.js'
import { type _PagingOptions, initPagingOptions } from '##/lib/proxy/proxy.auto-paging.js'
import { createQueryBuilderProxy } from '##/lib/proxy/proxy.index.js'
import { KmoreBuilderType, KmorePageKey } from '##/lib/types.js'

// import { createProxyTransacting } from '../proxy/proxy.transacting.js'

import type { BuilderHookOptions } from './hook.types.js'


// #region Pre Processor

export async function pagingPreProcessor(options: BuilderHookOptions): Promise<void> {
  if (options.builder.pagingType === KmoreBuilderType.counter) { return } // must compare with counter
  const { builderPager } = await genBuilderForPaging(options)
  if (! builderPager) { return }
  options.builder = builderPager
  // const builderPagerSql = builderPagerPatched.toQuery()
  // console.info({ builderPageSql: builderPagerSql })
}


interface GenBuilderForPagingRetType {
  total: bigint
  builderPager?: KmoreQueryBuilder | undefined
}

async function genBuilderForPaging(options: BuilderHookOptions): Promise<GenBuilderForPagingRetType> {
  const { kmore, builder } = options
  const pagingOptions = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingOptions)?.value as _PagingOptions
  if (! pagingOptions.enable) {
    return { total: 0n }
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

  // const pagingOptions: _PagingOptions = builder[KmorePageKey.PagingOptions]
  assert(pagingOptions, 'pagingOptions should be set')
  void Object.defineProperty(builder, KmorePageKey.PagingProcessed, {
    ...defaultPropDescriptor,
    value: true,
  })

  // clone
  const pagingOpts: PagingOptions = {
    ...initPagingOptions,
    ...pagingOptions,
  }
  // const queryCtxOpts: QueryContext = {
  //   wrapIdentifierCaseConvert: kmore.wrapIdentifierCaseConvert,
  //   postProcessResponseCaseConvert: caseConvert,
  //   kmoreQueryId,
  // }

  const builderPager = cloneBuilder(kmore, builder) // must before builderCounter
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
      enable: false, // paging counter should not be paged
    },
  })
  void Object.defineProperty(builderCounter, KmorePageKey.PagingBuilderType, {
    ...defaultPropDescriptor,
    writable: true,
    value: KmoreBuilderType.counter,
  })

  const { pagingGroupKey } = builderPager
  assert(pagingGroupKey, 'pagingGroupKey should be set on builderPager')
  void Object.defineProperty(builderCounter, KmorePageKey.pagingGroupKey, {
    ...defaultPropDescriptor,
    value: pagingGroupKey,
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

  // eq builder
  void Object.defineProperty(builderCounter, KmorePageKey.PagingMetaTotal, {
    ...defaultPropDescriptor,
    value: total,
  })

  const ret: GenBuilderForPagingRetType = {
    total,
  }
  if (! total) {
    // eq builder
    void Object.defineProperty(builderCounter, KmorePageKey.PagingBuilderType, {
      ...defaultPropDescriptor,
      value: KmoreBuilderType.pager,
    })
    return ret
  }

  void Object.defineProperty(builderPager, KmorePageKey.PagingBuilderType, {
    ...defaultPropDescriptor,
    value: KmoreBuilderType.pager,
  })
  void Object.defineProperty(builderPager, KmorePageKey.PagingOptions, {
    ...defaultPropDescriptor,
    value: pagingOpts,
  })

  void Object.defineProperty(builderPager, KmorePageKey.PagingMetaTotal, {
    ...defaultPropDescriptor,
    value: total,
  })

  const offset = pagingOptions.pageSize * (pagingOptions.page - 1)
  const limit = pagingOptions.pageSize <= total
    ? pagingOptions.pageSize
    : total < Number.MAX_SAFE_INTEGER ? Number(total) : Number.MAX_SAFE_INTEGER
  void builderPager.limit(limit).offset(Math.max(offset, 0))

  ret.builderPager = builderPager
  return ret
}


function cloneBuilder(
  kmore: Kmore,
  builder: KmoreQueryBuilder,
): KmoreQueryBuilder {

  const { caseConvert, kmoreQueryId, dbDict } = builder
  assert(kmoreQueryId, 'kmoreQueryId should be set on QueryBuilder')

  const pid = kmoreQueryId.toString()// Symbol(master-123)
  const key = /Symbol\((.*)\)/.exec(pid)?.[1] ?? pid
  const kmoreQueryId2 = Symbol(key + '-pager')
  let builderPager = builder.clone() as KmoreQueryBuilder

  let { pagingGroupKey } = builder
  if (! pagingGroupKey) {
    const key2 = builder.kmoreQueryId.toString().replace('Symbol(', '').replace(')', '')
    pagingGroupKey = Symbol(key2 + '-paging-group')
  }

  void Object.defineProperty(builderPager, KmorePageKey.pagingGroupKey, {
    ...defaultPropDescriptor,
    value: pagingGroupKey,
  })

  updateBuilderProperties(
    builderPager,
    caseConvert,
    kmoreQueryId2,
    dbDict,
    kmore.dbId,
    builder.scope,
  )
  builderPager = builderBindEvents({
    kmore,
    builder: builderPager,
    caseConvert,
  })
  createQueryBuilderProxy({ kmore, builder: builderPager })
  extRefTableFnPropertySmartJoin(builderPager, kmore.enableTrace)

  const trx = kmore.getTrxByQueryId(kmoreQueryId)
  if (trx) {
    void builderPager.transacting(trx)
  }

  return builderPager
}

