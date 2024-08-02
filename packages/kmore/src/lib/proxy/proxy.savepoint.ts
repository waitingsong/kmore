/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import type { AsyncMethodType } from '@waiting/shared-types'

import { createTrxProxy } from '##/lib/proxy/proxy.index.js' // use ## alias prevent from circular dependency checking

import { defaultPropDescriptor } from '../config.js'
import type { CreateProxyTrxOptions, ProxyCommitRunnerOptions } from '../kmore.js'
import type { KmoreTransaction, KmoreTransactionConfig } from '../types.js'
import { KmoreProxyKey } from '../types.js'
import { genKmoreTrxId } from '../util.js'


/**
 * Create a proxy for `rollback` method on Transaction
 */
export function createProxySavepoint(options: CreateProxyTrxOptions): KmoreTransaction {
  const { transaction } = options

  // @ts-ignore
  assert(typeof transaction[KmoreProxyKey._ori_savepoint] === 'undefined', 'trx[KmoreProxyKey._ori_savepoint] should be undefined')

  void Object.defineProperty(transaction, KmoreProxyKey._ori_savepoint, {
    ...defaultPropDescriptor,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    value: transaction.savepoint,
  })

  void Object.defineProperty(transaction, KmoreProxyKey.savepoint, {
    ...defaultPropDescriptor,
    writable: true,
    value: (...args: unknown[]) => _proxySavepoint({ ...options, args }),
  })

  return transaction
}


async function _proxySavepoint(options: ProxyCommitRunnerOptions): Promise<KmoreTransaction> {
  const { kmore, transaction, config, args } = options
  assert(transaction.isTransaction === true, 'parent trx not a transaction when creating savepoint')

  // @ts-ignore _ori_commit
  const trx = await Reflect.apply(transaction[KmoreProxyKey._ori_savepoint] as AsyncMethodType, transaction, []) as KmoreTransaction
  assert(trx.isTransaction === true, 'output trx not a transaction when creating savepoint')
  assert(! trx.isCompleted(), 'output trx already completed when creating savepoint')

  const kmoreTrxId = genKmoreTrxId(transaction.kmoreTrxId)
  assert(kmoreTrxId, 'kmoreTrxId must be provided from parent trx when creating savepoint')
  assert(kmoreTrxId !== transaction.kmoreTrxId, 'kmoreTrxId === parentTrx.kmoreTrxId')

  const trx2 = createTrxProxy({
    kmore,
    config,
    transaction: trx,
    trxActionOnError: transaction.trxActionOnError, // from parent trx
    kmoreTrxId,
  })
  const cb = args[0] as ((trx: KmoreTransaction) => Promise<void>) | undefined
  if (typeof cb === 'function') {
    await cb(trx2)
  }
  return trx2
}

export function updateTrxProperties(options: CreateProxyTrxOptions): void {
  const {
    kmore,
    config,
    transaction: trx,
    trxActionOnError: preDefinedTrxActionOnError,
    kmoreTrxId: preDefinedKmoreTrxId,
  } = options

  Object.defineProperty(trx, 'dbId', {
    ...defaultPropDescriptor,
    value: kmore.dbId,
  })

  const kmoreTrxId = preDefinedKmoreTrxId ?? config?.kmoreTrxId ?? genKmoreTrxId(config?.kmoreTrxId)
  // delete config?.kmoreTrxId
  assert(kmoreTrxId, 'kmoreTrxId must be provided')
  Object.defineProperty(trx, 'kmoreTrxId', {
    ...defaultPropDescriptor,
    value: kmoreTrxId,
  })

  const trxActionOnError: KmoreTransactionConfig['trxActionOnError'] = config?.trxActionOnError
    ?? preDefinedTrxActionOnError ?? 'rollback'
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
    value: config?.scope, // may undefined
  })
}

