import assert from 'assert'

import type { KmoreBase } from './base.js'
import { pager } from './builder.auto-paging.js'
import { builderBindEvents } from './builder.event.js'
import { createBuilderProperties } from './builder.props.js'
import type { DbQueryBuilder, KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { builderApplyTransactingProxy } from './proxy.apply.js'
import { extRefTableFnPropertyAutoPaging } from './proxy.auto-paging.js'
import { createQueryBuilderGetProxy } from './proxy.get.js'
import { proxyGetThen } from './proxy.get.then.js'
import { extRefTableFnPropertySmartJoin } from './smart-join.js'
import { CaseType } from './types.js'


export function createRefTables<
  D,
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
  if (! kmore?.dict?.tables || ! Object.keys(kmore.dict?.tables)?.length) {
    console.info('Kmore:createRefTables() kmore.dict or kmore.dict.tables empty')
    return rb
  }

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  Object.keys(kmore.dict.tables).forEach((refName) => {
    const name = `${prefix}${refName}`
    Object.defineProperty(rb, name, {
      ...defaultPropDescriptor,
      writable: true,
      value: (ctx?: Context) => {
        const ctx2 = ctx ?? { id: kmore.dbId, instanceId: kmore.instanceId }
        return extRefTableFnProperty(kmore, refName, caseConvert, ctx2)
      }, // must dynamically!!
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
): KmoreQueryBuilder {

  assert(caseConvert, 'caseConvert must be defined')

  const kmoreQueryId = Symbol(`${kmore.dbId}-${Date.now()}`)

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
    resultPagerHandler: pager,
  })

  refTable = builderApplyTransactingProxy(kmore, refTable, ctx)
  refTable = extRefTableFnPropertySmartJoin(refTable)

  refTable = builderBindEvents(
    kmore,
    refTable as KmoreQueryBuilder,
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
  )

  return refTable
}


