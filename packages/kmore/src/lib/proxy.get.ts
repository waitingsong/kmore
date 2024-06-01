import type { CreateQueryBuilderGetProxyOptions } from './base.js'
import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'


export function createQueryBuilderGetProxy(options: CreateQueryBuilderGetProxyOptions): KmoreQueryBuilder {

  const {
    kmore,
    thenHandler,
    resultPagerHandler,
    ctxBuilderPreProcessor,
    ctxBuilderResultPreProcessor,
    ctxExceptionHandler,
  } = options

  void Object.defineProperty(options.builder, '_ori_then', {
    ...defaultPropDescriptor,
    writable: true,
    value: options.builder.then,
  })

  void Object.defineProperty(options.builder, 'then', {
    ...defaultPropDescriptor,
    writable: true,
    value: thenHandler({ // proxyGetThen
      kmore,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      builder: options.builder,
      propKey: 'then',
      resultPagerHandler,
      ctxBuilderPreProcessor,
      ctxBuilderResultPreProcessor,
      ctxExceptionHandler,
    }),
  })

  const ret = options.builder

  void Object.defineProperty(ret, 'createQueryBuilderGetProxyKey', {
    ...defaultPropDescriptor,
    value: Date.now(),
  })

  return ret
}

