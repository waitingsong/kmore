import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'


export function extRefTableFnPropertyDummy(refTable: KmoreQueryBuilder): KmoreQueryBuilder {
  const fnName = 'dummy'

  if (typeof refTable[fnName] === 'function') {
    return refTable
  }

  void Object.defineProperty(refTable, fnName, {
    ...defaultPropDescriptor,
    value: () => refTable,
  })

  return refTable
}

