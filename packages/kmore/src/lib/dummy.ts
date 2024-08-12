import type { KmoreQueryBuilder } from './builder/builder.types.js'
import { defaultPropDescriptor } from './config.js'


export function extRefTableFnPropertyDummy(refTable: KmoreQueryBuilder): void {
  const fnName = 'dummy'

  if (typeof refTable[fnName] === 'function') { return }

  void Object.defineProperty(refTable, fnName, {
    ...defaultPropDescriptor,
    value: () => refTable,
  })
}

