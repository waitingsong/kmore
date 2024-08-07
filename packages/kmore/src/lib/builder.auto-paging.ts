import assert from 'node:assert'

import type { KmoreBase, PagerOptions, CreateQueryBuilderGetProxyOptions } from './base.js'
import { builderBindEvents } from './builder.event.js'
import { createBuilderProperties } from './builder.props.js'
import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import type {
  PageRawType,
  PagingMeta,
  PageWrapType,
} from './paging.types.js'
import { builderApplyTransactingProxy } from './proxy.apply.js'
import type { _PagingOptions } from './proxy.auto-paging.js'
import { initPageTypeMapping } from './proxy.auto-paging.js'
import { proxyGetThen } from './proxy.get.then.js'
import { extRefTableFnPropertySmartJoin } from './smart-join.js'
import { KmorePageKey } from './types.js'
import { genKmoreTrxId } from './util.js'


export async function pager<T = unknown>(
  options: PagerOptions,
  proxyCreator: (options: CreateQueryBuilderGetProxyOptions) => KmoreQueryBuilder,
): Promise<PageRawType<T> | PageWrapType<T> | undefined> {

  const { kmore } = options

  const { total, builderPager, pagingOptions } = await genBuilderForPaging(options)

  const props: PagingMeta = {
    total,
    page: +pagingOptions.page,
    pageSize: +pagingOptions.pageSize,
  }

  const outputMapping = pagingOptions.wrapOutput
    ? { ...initPageTypeMapping }
    : void 0


  if (! total || ! builderPager) {
    if (outputMapping) {
      const data: PageWrapType<T> = {
        ...props,
        rows: [],
      }
      return data
    }
    else {
      return addPagingMetaOnArray([], props)
    }
  }

  // const builderPagerPatched = createQueryBuilderGetProxy(kmore, builderPager)
  const builderPagerPatched = proxyCreator({
    kmore,
    builder: builderPager,
    thenHandler: proxyGetThen,
    ctxBuilderPreProcessor: options.ctxBuilderPreProcessor,
    ctxBuilderResultPreProcessor: options.ctxBuilderResultPreProcessor,
    ctxExceptionHandler: options.ctxExceptionHandler,
  })

  // const builderPagerSql = builderPagerPatched.toQuery()
  // console.info({ builderPageSql: builderPagerSql })

  return pagingOptions.wrapOutput
    ? builderPagerPatched.then((rows: T[] | undefined) => genOutputData(rows, props, outputMapping))
    : builderPagerPatched.then((rows: T[] | undefined) => addPagingMetaOnArray(rows, props))
}

function genOutputData<T = unknown>(
  input: T[] | undefined,
  props: PagingMeta,
  outputMapping: Record<keyof PageWrapType, string> | undefined,
): PageWrapType<T> {

  assert(outputMapping, 'outputMapping should be set')
  assert(Object.keys(outputMapping).length, 'outputMapping should not be empty')

  const total = BigInt(props.total)
  if (input) {
    if (props.page === 1 && total < props.pageSize && input.length < total) {
      props.total = BigInt(input.length)
    }
  }
  else if (props.page === 1) {
    props.total = 0n
  }

  const data: PageWrapType<T> = {
    ...props,
    rows: input ?? [],
  }

  Object.entries(outputMapping).forEach(([key, key2]) => {
    if (! Object.hasOwn(props, key)) { return }
    // @ts-ignore
    const value = props[key] as unknown
    Object.defineProperty(data, key2, {
      ...defaultPropDescriptor,
      value,
    })
  })

  return data
}


function addPagingMetaOnArray<T = unknown>(
  input: T[] | undefined,
  props: PagingMeta,
): PageRawType<T> | undefined {

  if (! Array.isArray(input)) { return }

  const total = BigInt(props.total)
  if (input.length) {
    if (props.page === 1 && total < props.pageSize && input.length < total) {
      props.total = BigInt(input.length)
    }
  }
  else if (props.page === 1) {
    props.total = 0n
  }

  Object.entries(props).forEach(([key, value]) => {
    Object.defineProperty(input, key, {
      ...defaultPropDescriptor,
      enumerable: false,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      value,
    })
  })
  return input as PageRawType<T>
}

interface GenBuilderForPagingRetType {
  total: bigint
  pagingOptions: _PagingOptions
  builderPager?: KmoreQueryBuilder | undefined
}
async function genBuilderForPaging(options: PagerOptions): Promise<GenBuilderForPagingRetType> {

  const { kmore, builder } = options

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
  const pagingOptions: _PagingOptions = builder[KmorePageKey.PagingOptions]
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
    .clearHaving()
    .clearOrder()
    .clearSelect()
    .count({ total: '*' })
    .limit(1)
  // const builderCounterSql = builderCounter.toQuery()
  // console.info({ builderCounterSql })

  const total = await builderCounter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    .offset(offset >= 0 ? offset : 0) as unknown as KmoreQueryBuilder

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

  builderPager = createBuilderProperties(
    builderPager,
    caseConvert,
    kmoreQueryId2,
    dbDict,
    kmore.dbId,
  )

  const trx = kmore.getTrxByKmoreQueryId(kmoreQueryId)
  if (trx) {
    void builderPager.transacting(trx)
  }

  return builderPager
}

