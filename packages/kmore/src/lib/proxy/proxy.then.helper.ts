/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import { defaultPropDescriptor } from '../config.js'
import type { ResponseHookOptions } from '../hook/hook.types.js'
import { KmoreProxyKey } from '../types.js'


interface ProcessThenRetOptions<Resp = unknown> extends Omit<ResponseHookOptions<Resp>, 'response'> {
  input: Promise<Resp>
  transactionalProcessed: boolean | undefined
}

export async function processThenRet(options: ProcessThenRetOptions): Promise<unknown> {
  const { input, kmore } = options

  const { responsePreHooks: responsePreHook } = kmore.hookList
  assert(Array.isArray(responsePreHook), 'responsePreHook should be an array in Kmore')

  let resp = await input
  const opts: ResponseHookOptions = {
    ...options,
    response: resp,
  }
  // @ts-ignore
  delete opts['input']

  for (const processor of responsePreHook) {
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

