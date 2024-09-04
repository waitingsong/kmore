import assert from 'node:assert'

import { defaultPropDescriptor } from '##/lib/config.js'
import type {
  PageRawType,
  PageWrapType,
  PagingMeta,
} from '##/lib/paging.types.js'
import { initPageTypeMapping, type _PagingOptions } from '##/lib/proxy/proxy.auto-paging.js'
import { KmoreBuilderType, KmorePageKey } from '##/lib/types.js'

import type { ResponseHookOptions } from './hook.types.js'


export async function pagingPostProcessor(options: ResponseHookOptions): Promise<void> {
  const { response, builder } = options

  if (! response || ! Array.isArray(response)) { return }

  const builderType = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingBuilderType)?.value as KmoreBuilderType | undefined
  if (! builderType || builderType !== KmoreBuilderType.pager) { return }

  const total = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingMetaTotal)?.value as bigint | undefined
  assert(typeof total === 'bigint', 'total should be a bigint')

  const pagingOptions = Object.getOwnPropertyDescriptor(builder, KmorePageKey.PagingOptions)?.value as _PagingOptions | undefined
  assert(pagingOptions, 'pagingOptions should be set on builder')

  const props: PagingMeta = {
    total,
    page: +pagingOptions.page,
    pageSize: +pagingOptions.pageSize,
  }
  const outputMapping = pagingOptions.wrapOutput
    ? { ...initPageTypeMapping }
    : void 0

  options.response = pagingOptions.wrapOutput
    ? genOutputData(response as unknown[], props, outputMapping)
    : addPagingMetaOnArray(response as unknown[], props)
}

function genOutputData<T = unknown>(
  input: T[],
  props: PagingMeta,
  outputMapping: Record<keyof PageWrapType, string> | undefined,
): PageWrapType<T> {

  assert(Array.isArray(input), 'input should be an array')
  assert(outputMapping, 'outputMapping should be set')
  assert(Object.keys(outputMapping).length, 'outputMapping should not be empty')

  // const total = BigInt(props.total)
  // if (input) {
  //   if (props.page === 1 && total < props.pageSize && input.length < total) {
  //     props.total = BigInt(input.length)
  //   }
  // }
  // else if (props.page === 1) {
  //   props.total = 0n
  // }

  const data: PageWrapType<T> = {
    ...props,
    rows: input,
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
  input: T[],
  props: PagingMeta,
): PageRawType<T> | T {

  assert(Array.isArray(input), 'input should be an array')

  // const total = BigInt(props.total)
  // if (input.length) {
  //   if (props.page === 1 && total < props.pageSize && input.length < total) {
  //     props.total = BigInt(input.length)
  //   }
  // }
  // else if (props.page === 1) {
  //   props.total = 0n
  // }

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

