import assert from 'node:assert'

import { QueryBuilderExtKey } from '../builder/builder.types.js'
import { defaultPropDescriptor } from '../config.js'
import type { CreateProxyTrxOptions } from '../kmore.js'
import { TrxControl } from '../trx.types.js'
import type { KmoreTransactionConfig } from '../types.js'
import { genKmoreTrxId } from '../util.js'


export function updateTrxProperties(options: CreateProxyTrxOptions): void {
  const {
    kmore,
    config,
    transaction: trx,
  } = options

  Object.defineProperty(trx, 'dbId', {
    ...defaultPropDescriptor,
    value: kmore.dbId,
  })

  const kmoreTrxId = config.kmoreTrxId ?? genKmoreTrxId(config.kmoreTrxId)
  // delete config?.kmoreTrxId
  assert(kmoreTrxId, 'kmoreTrxId must be provided')
  Object.defineProperty(trx, 'kmoreTrxId', {
    ...defaultPropDescriptor,
    value: kmoreTrxId,
  })

  const trxActionOnError: KmoreTransactionConfig['trxActionOnError'] = config.trxActionOnError ?? TrxControl.Rollback
  Object.defineProperty(trx, 'trxActionOnError', {
    ...defaultPropDescriptor,
    value: trxActionOnError,
  })

  Object.defineProperty(trx, 'ctime', {
    ...defaultPropDescriptor,
    value: new Date(),
  })

  Object.defineProperty(trx, 'scope', {
    ...defaultPropDescriptor,
    writable: true,
    value: config.scope,
  })

  Object.defineProperty(trx, 'processingHooks', {
    ...defaultPropDescriptor,
    value: new Set(),
  })

  Object.defineProperty(trx, QueryBuilderExtKey.trxPropagateOptions, {
    ...defaultPropDescriptor,
    writable: true,
    value: config.trxPropagateOptions,
  })
}

