import assert from 'node:assert'

import { context } from '@opentelemetry/api'

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

  const resp = await input
  const opts: ResponseHookOptions = {
    ...options,
    response: resp,
  }
  // @ts-ignore
  delete opts['input']

  for (const processor of responsePreHook) {
    if (kmore.enableTrace) {
      await context.with(context.active(), async () => {
        await processor(opts)
      })
      continue
    }
    await processor(opts)
  }

  updateRespProperties(opts.response)
  return opts.response
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

