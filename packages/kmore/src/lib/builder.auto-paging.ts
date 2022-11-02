import assert from 'node:assert'

import type { KmoreBase, PagerOptions, ProxyGetOptions } from './base.js'
import { builderBindEvents } from './builder.event.js'
import { createBuilderProperties } from './builder.props.js'
import type {
  PagingOptions,
  KmoreQueryBuilder,
  PageArrayType,
  PagingMeta,
} from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { builderApplyTransactingProxy } from './proxy.apply.js'
import { proxyGetThen } from './proxy.get.then.js'
import { extRefTableFnPropertySmartJoin } from './smart-join.js'
import { KmorePageKey } from './types.js'
import { genKmoreTrxId } from './util.js'


export async function pager<T = unknown>(
  options: PagerOptions,
  proxyCreator: (options: ProxyGetOptions) => KmoreQueryBuilder,
): Promise<PageArrayType<T> | undefined> {

  const { kmore } = options

  const { total, builderPager, pagingOptions } = await genBuilderForPaging(options)

  const props: PagingMeta = {
    pageCountAll: total,
    pageCurrent: +pagingOptions.page,
    pageSize: +pagingOptions.pageSize,
  }

  if (! total || ! builderPager) {
    return addPaginMetaOnArray([], props)
  }

  // const builderPagerPatched = createQueryBuilderGetProxy(kmore, builderPager)
  const builderPagerPatched = proxyCreator({
    kmore,
    builder: builderPager,
    thenHandler: proxyGetThen,
  })

  // const builderPagerSql = builderPagerPatched.toQuery()
  // console.info({ builderPageSql: builderPagerSql })

  return builderPagerPatched.then((rows: T[] | undefined) => addPaginMetaOnArray(rows, props))
}

function addPaginMetaOnArray<T = unknown>(
  input: T[] | undefined,
  props: PagingMeta,
): PageArrayType<T> | undefined {

  if (! Array.isArray(input)) { return }

  Object.entries(props).forEach(([key, value]) => {
    Object.defineProperty(input, key, {
      ...defaultPropDescriptor,
      enumerable: false,
      value,
    })
  })
  return input as PageArrayType<T>
}

interface GenBuilderForPagingRetType {
  total: number
  pagingOptions: PagingOptions
  builderPager?: KmoreQueryBuilder | undefined
}
async function genBuilderForPaging(
  options: PagerOptions,
): Promise<GenBuilderForPagingRetType> {

  const { kmore, builder } = options

  assert(
    ! Object.hasOwn(builder, KmorePageKey.PagingProcessed),
    'Paging already processed',
  )

  // @ts-ignore
  const method = builder['_method'] as string
  assert(
    method === 'select',
    'autoPaging() can only be called on SELECT queries, .first() not supported',
  )

  // @ts-ignore
  const pagingOptions: PagingOptions = builder[KmorePageKey.PagingOptions]
  assert(pagingOptions, 'pagingOptions should be set')
  void Object.defineProperty(builder, KmorePageKey.PagingProcessed, {
    ...defaultPropDescriptor,
    value: true,
  })
  void Object.defineProperty(builder, KmorePageKey.PagingBuilderType, {
    ...defaultPropDescriptor,
    value: 'counter',
  })

  const builderPager = cloneBuilder(kmore, builder)
  void Object.defineProperty(builderPager, KmorePageKey.PagingBuilderType, {
    ...defaultPropDescriptor,
    value: 'pager',
  })

  // const queryCtxOpts: QueryContext = {
  //   wrapIdentifierCaseConvert: kmore.wrapIdentifierCaseConvert,
  //   postProcessResponseCaseConvert: caseConvert,
  //   kmoreQueryId,
  // }

  const builderCounter = builder
    .clearCounters()
    .clearGroup()
    .clearOrder()
    .clearSelect()
    .count({ total: '*' })
    .limit(1)
  // const builderCounterSql = builderCounter.toQuery()
  // console.info({ builderCounterSql })

  const total = await builderCounter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((rows: [{ total: number }]) => {
      return rows[0].total > 0 ? +rows[0].total : 0
    })

  const ret: GenBuilderForPagingRetType = {
    total,
    pagingOptions,
  }

  if (! total) {
    return ret
  }

  const offset = pagingOptions.pageSize * (pagingOptions.page - 1)

  const b3 = builderPager
    .limit(pagingOptions.pageSize)
    .offset(offset >= 0 ? offset : 0) as KmoreQueryBuilder

  ret.builderPager = b3
  return ret
}


function cloneBuilder(
  kmore: KmoreBase,
  builder: KmoreQueryBuilder,
): KmoreQueryBuilder {

  const { caseConvert, kmoreQueryId, dbDict } = builder
  assert(kmoreQueryId, 'kmoreQueryId should be set on QueryBuilder')

  const ctx = { id: kmore.dbId, instanceId: kmore.instanceId }
  const kmoreQueryId2 = genKmoreTrxId(kmoreQueryId, '-pager')

  let builderPager = builder.clone() as KmoreQueryBuilder
  builderPager = builderApplyTransactingProxy(kmore, builderPager, ctx)
  builderPager = extRefTableFnPropertySmartJoin(builderPager)
  builderPager = builderBindEvents(
    kmore,
    builderPager,
    caseConvert,
    ctx,
    kmoreQueryId2,
  )

  builderPager = createBuilderProperties(builderPager, caseConvert, kmoreQueryId2, dbDict)

  const trx = kmore.getTrxByKmoreQueryId(kmoreQueryId)
  if (trx) {
    void builderPager.transacting(trx)
  }

  return builderPager
}
