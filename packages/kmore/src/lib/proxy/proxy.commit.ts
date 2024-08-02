/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

// import { genError } from '@waiting/shared-core'
import type { AsyncMethodType } from '@waiting/shared-types'

import { defaultPropDescriptor } from '../config.js'
import type { CreateProxyTrxOptions, ProxyCommitRunnerOptions } from '../kmore.js'
import type { KmoreTransaction } from '../types.js'
import { KmoreProxyKey } from '../types.js'


/**
 * Create a proxy for `commit` method on Transaction
 */
export function createProxyCommit(options: CreateProxyTrxOptions): KmoreTransaction {
  const { transaction } = options

  // @ts-ignore
  assert(typeof transaction[KmoreProxyKey._ori_commit] === 'undefined', 'trx[KmoreProxyKey._ori_commit] should be undefined')

  void Object.defineProperty(transaction, KmoreProxyKey._ori_commit, {
    ...defaultPropDescriptor,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    value: transaction.commit,
  })

  void Object.defineProperty(transaction, KmoreProxyKey.commit, {
    ...defaultPropDescriptor,
    writable: true,
    value: (...args: unknown[]) => _proxyCommit({ ...options, args }),
  })

  return transaction
}


async function _proxyCommit(options: ProxyCommitRunnerOptions): Promise<void> {
  const { kmore, transaction, args } = options
  if (transaction.isCompleted()) { return }

  // @ts-ignore _ori_commit
  await Reflect.apply(transaction[KmoreProxyKey._ori_commit] as AsyncMethodType, transaction, args)
  const { kmoreTrxId, scope } = transaction
  kmore.removeTrxIdCache(kmoreTrxId, scope)
}

