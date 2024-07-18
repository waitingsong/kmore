import assert from 'node:assert'

import type { BuilderPreProcessorOptions, KmoreBase, ResponsePreProcessorOptions } from '##/lib/base.js'
import { builderBindEvents } from '##/lib/builder.event.js'
import { createBuilderProperties } from '##/lib/builder.props.js'
import type { KmoreQueryBuilder } from '##/lib/builder.types.js'
import { defaultPropDescriptor } from '##/lib/config.js'
import type {
  PageRawType,
  PageWrapType,
  PagingMeta,
  PagingOptions,
} from '##/lib/paging.types.js'
import { builderApplyTransactingProxy } from '##/lib/proxy.apply.js'
import { initPageTypeMapping, initPagingOptions, type _PagingOptions } from '##/lib/proxy.auto-paging.js'
// import { initPageTypeMapping } from '##/lib/proxy.auto-paging.js'
import { extRefTableFnPropertySmartJoin } from '##/lib/smart-join.js'
import { KmorePageKey } from '##/lib/types.js'
import { genKmoreTrxId } from '##/lib/util.js'



export async function pagingPostProcessor(options: ResponsePreProcessorOptions): Promise<unknown> {
  const { pagingOptions, response } = options

  if (! response || ! Array.isArray(response)) {
    return response
  }

  const total = 999n // DEBUG

  const props: PagingMeta = {
    total,
    page: +pagingOptions.page,
    pageSize: +pagingOptions.pageSize,
  }
  const outputMapping = pagingOptions.wrapOutput
    ? { ...initPageTypeMapping }
    : void 0

  const ret = pagingOptions.wrapOutput
    ? genOutputData(response, props, outputMapping)
    : addPagingMetaOnArray(response, props)
  return ret
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

