import type { CreateQueryBuilderGetProxyOptions } from './base.js'
import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'


export function createQueryBuilderGetProxy(options: CreateQueryBuilderGetProxyOptions): KmoreQueryBuilder {
  const { builder, kmore, thenHandler } = options

  void Object.defineProperty(builder, '_ori_then', {
    ...defaultPropDescriptor,
    writable: true,
    value: builder.then,
  })

  void Object.defineProperty(builder, 'then', {
    ...defaultPropDescriptor,
    writable: true,
    value: thenHandler({ // proxyGetThen
      kmore,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      builder,
      propKey: 'then',
    }),
  })

  void Object.defineProperty(builder, 'createQueryBuilderGetProxyKey', {
    ...defaultPropDescriptor,
    value: Date.now(),
  })

  return builder
}

