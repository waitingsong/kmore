import assert from 'assert'

import type { KmoreBase } from './base.js'
import { builderBindEvents } from './builder.event.js'
import { defaultPropDescriptor } from './config.js'
import { builderApplyTransactingProxy } from './proxy.apply.js'
import { createQueryBuilderGetProxy } from './proxy.get.js'
import { extRefTableFnPropertySmartJoin } from './smart-join.js'
import {
  CaseType,
  DbQueryBuilder,
  KmoreQueryBuilder,
} from './types.js'


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
  refTable = createQueryBuilderGetProxy(kmore, refTable)

  refTable = builderApplyTransactingProxy(kmore, refTable, ctx)
  refTable = extRefTableFnPropertySmartJoin(refTable)

  refTable = builderBindEvents(
    kmore,
    refTable as KmoreQueryBuilder,
    caseConvert,
    ctx,
    kmoreQueryId,
  )

  void Object.defineProperty(refTable, 'kmoreQueryId', {
    ...defaultPropDescriptor,
    value: kmoreQueryId,
  })

  void Object.defineProperty(refTable, 'dbDict', {
    ...defaultPropDescriptor,
    value: kmore.dict,
  })

  void Object.defineProperty(refTable, '_tablesJoin', {
    ...defaultPropDescriptor,
    value: [],
  })

  return refTable
}

