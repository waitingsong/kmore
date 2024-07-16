/* eslint-disable max-params */
/* eslint-disable @typescript-eslint/ban-types */
import assert from 'node:assert'

import type { KmoreBase } from './base.js'
import { pager } from './builder.auto-paging.js'
import { builderBindEvents } from './builder.event.js'
import { createBuilderProperties } from './builder.props.js'
import type {
  CtxBuilderPreProcessor,
  CtxBuilderResultPreProcessor,
  CtxExceptionHandler,
  DbQueryBuilder,
  KmoreQueryBuilder,
  TbQueryBuilder,
} from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { extRefTableFnPropertyDummy } from './dummy.js'
import { builderApplyTransactingProxy } from './proxy.apply.js'
import { extRefTableFnPropertyAutoPaging } from './proxy.auto-paging.js'
import { createQueryBuilderGetProxy } from './proxy.get.js'
import { proxyGetThen } from './proxy.get.then.js'
import { extRefTableFnPropertySmartJoin } from './smart-join.js'
import type { CaseType } from './types.js'


export function createRefTables<
  D extends object,
  Context,
  P extends string,
>(
  kmore: KmoreBase<Context>,
  prefix: P,
  caseConvert: CaseType,
): DbQueryBuilder<Context, D, P, CaseType> {

  const rb = {} as DbQueryBuilder<Context, D, P, CaseType>

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  if (! kmore.dict?.tables || ! Object.keys(kmore.dict.tables).length) {
    console.info('Kmore:createRefTables() kmore.dict or kmore.dict.tables empty')
    return rb
  }

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  Object.keys(kmore.dict.tables).forEach((refName) => {
    const name = `${prefix}${refName}`

    // @ts-expect-error
    const queryBuilderCreator: TbQueryBuilder<D, CaseType, {}, Context> = (options) => {
      const ctx2 = options?.ctx ?? { id: kmore.dbId, instanceId: kmore.instanceId }
      return extRefTableFnProperty(
        kmore,
        refName,
        caseConvert,
        ctx2,
        options?.ctxBuilderPreProcessor,
        options?.ctxBuilderResultPreProcessor,
        options?.ctxExceptionHandler,
      ) as DbQueryBuilder<Context, D, P, CaseType>
    } // must dynamically!!

    Object.defineProperty(rb, name, {
      ...defaultPropDescriptor,
      writable: true,
      value: queryBuilderCreator,
    })

    Object.defineProperty(rb[name as keyof typeof rb], 'name', {
      ...defaultPropDescriptor,
      value: name,
    })

  })

  return rb
}

function extRefTableFnProperty(
  kmore: KmoreBase,
  refName: string,
  caseConvert: CaseType,
  ctx: unknown,
  ctxBuilderPreProcessor: CtxBuilderPreProcessor | undefined,
  ctxBuilderResultPreProcessor: CtxBuilderResultPreProcessor | undefined,
  ctxExceptionHandler: CtxExceptionHandler | undefined,
): KmoreQueryBuilder {

  assert(caseConvert, 'caseConvert must be defined')

  const kmoreQueryId = Symbol(`${kmore.dbId}-${Date.now().toString()}`)

  // @ts-ignore
  assert(kmore.dbh)
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  let refTable = kmore.dbh(refName) as KmoreQueryBuilder

  // refTable = extRefTableFnPropertyThen(kmore, refTable, ctx) // must before getProxy
  // refTable = createQueryBuilderGetProxy(kmore, refTable)
  refTable = createQueryBuilderGetProxy({
    kmore,
    builder: refTable,
    thenHandler: proxyGetThen,
    ctxBuilderPreProcessor,
    ctxBuilderResultPreProcessor,
    ctxExceptionHandler,
    resultPagerHandler: pager,
  })

  refTable = builderApplyTransactingProxy(kmore, refTable, ctx)
  refTable = extRefTableFnPropertySmartJoin(refTable)
  refTable = extRefTableFnPropertyDummy(refTable)

  refTable = builderBindEvents(
    kmore,
    refTable,
    caseConvert,
    ctx,
    kmoreQueryId,
  )
  refTable = extRefTableFnPropertyAutoPaging(refTable)

  refTable = createBuilderProperties(
    refTable,
    caseConvert,
    kmoreQueryId,
    kmore.dict,
    kmore.dbId,
  )

  return refTable
}


