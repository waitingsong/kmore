/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import type { ResponsePreProcessorOptions } from './base.js'
import type { CtxBuilderResultPreProcessorOptions } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'
import { KmoreProxyKey } from './types.js'


interface ProcessThenRetOptions<Resp = unknown> extends Omit<CtxBuilderResultPreProcessorOptions<Resp>, 'response'> {
  kmoreQueryId: symbol
  input: Promise<Resp>
  transactionalProcessed: boolean | undefined
}

export async function processThenRet(options: ProcessThenRetOptions): Promise<unknown> {
  const { input, kmore } = options

  const { responsePreProcessors } = kmore
  assert(Array.isArray(responsePreProcessors), 'responsePreProcessors should be an array in Kmore')

  let resp = await input
  const opts: ResponsePreProcessorOptions = {
    ...options,
    response: resp,
  }
  // @ts-expect-error
  delete opts['input']

  for (const processor of responsePreProcessors) {
    // eslint-disable-next-line no-await-in-loop
    resp = await processor(opts)
  }

  updateRespProperties(resp)
  return resp
}


function updateRespProperties(resp: unknown): void {
  if (resp && typeof resp === 'object') {
    Object.defineProperty(resp, KmoreProxyKey.getThenProxyProcessed, {
      ...defaultPropDescriptor,
      enumerable: false,
      writable: true,
      value: true,
    })
  }
}

