/* eslint-disable max-params */
/* eslint-disable @typescript-eslint/ban-types */
import assert from 'node:assert'

import { defaultPropDescriptor } from '../config.js'
import { extRefTableFnPropertyDummy } from '../dummy.js'
import type { Kmore } from '../kmore.js'
import { extRefTableFnPropertyAutoPaging } from '../proxy/proxy.auto-paging.js'
import { createQueryBuilderProxy } from '../proxy/proxy.index.js'
import type { CaseType } from '../types.js'

import { builderBindEvents } from './builder.event.js'
import { UpdateBuilderProperties } from './builder.props.js'
import type { DbQueryBuilder, KmoreQueryBuilder } from './builder.types.js'
import { extRefTableFnPropertySmartJoin } from './smart-join.js'


export function createRefTables<
  D extends object,
  P extends string,
>(
  kmore: Kmore,
  prefix: P,
  caseConvert: CaseType,
): DbQueryBuilder<D, P, CaseType> {

  const rb = {} as DbQueryBuilder<D, P, CaseType>

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

    Object.defineProperty(rb, name, {
      ...defaultPropDescriptor,
      writable: true,
      value: () => { // builder generation must dynamically!
        return createQueryBuilder(
          kmore,
          refName,
          caseConvert,
        ) as KmoreQueryBuilder<D, CaseType, object, object[]>
      },
    })

    Object.defineProperty(rb[name as keyof typeof rb], 'name', {
      ...defaultPropDescriptor,
      value: name,
    })

  })

  return rb
}

function createQueryBuilder(
  kmore: Kmore,
  refName: string,
  caseConvert: CaseType,
): KmoreQueryBuilder {

  assert(caseConvert, 'caseConvert must be defined')

  const kmoreQueryId = Symbol(`${kmore.dbId}-${Date.now().toString()}`)

  // @ts-ignore
  assert(kmore.dbh)
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  let builder = kmore.dbh(refName) as KmoreQueryBuilder

  UpdateBuilderProperties(
    builder,
    caseConvert,
    kmoreQueryId,
    kmore.dict,
    kmore.dbId,
  )

  builder = builderBindEvents({
    kmore,
    builder,
    caseConvert,
  })

  createQueryBuilderProxy({
    kmore,
    builder,
  })
  extRefTableFnPropertySmartJoin(builder)
  extRefTableFnPropertyDummy(builder)
  extRefTableFnPropertyAutoPaging(builder)

  kmore.hookList.builderPreHooks.forEach((processor) => {
    assert(typeof processor === 'function', 'builderPreHook should be an array of functions')
    // eslint-disable-next-line no-await-in-loop
    builder = processor({ builder, kmore }).builder
  })

  return builder
}


