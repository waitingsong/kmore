/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import type { AsyncMethodType } from '@waiting/shared-types'

import { defaultPropDescriptor } from '../config.js'
import type { TransactionHookOptions } from '../hook/hook.types.js'
import type { CreateProxyTrxOptions, ProxyCommitRunnerOptions } from '../kmore.js'
import type { KmoreTransaction } from '../types.js'
import { KmoreProxyKey } from '../types.js'


/**
 * Create a proxy for `rollback` method on Transaction
 */
export function createProxyRollback(options: CreateProxyTrxOptions): KmoreTransaction {
  const { transaction } = options

  // @ts-ignore
  assert(typeof transaction[KmoreProxyKey._ori_rollback] === 'undefined', 'trx[KmoreProxyKey._ori_rollback] should be undefined')

  void Object.defineProperty(transaction, KmoreProxyKey._ori_rollback, {
    ...defaultPropDescriptor,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    value: transaction.rollback,
  })

  void Object.defineProperty(transaction, KmoreProxyKey.rollback, {
    ...defaultPropDescriptor,
    writable: true,
    value: () => {
      return _proxyRollback({ ...options, args: [] })
    },
  })

  return transaction
}


async function _proxyRollback(options: ProxyCommitRunnerOptions): Promise<void> {
  const { kmore, transaction } = options

  const { beforeRollbackHooks, afterRollbackHooks } = kmore.hookList
  const opts: TransactionHookOptions = { kmore, trx: transaction, config: options.config }

  if (beforeRollbackHooks.length) {
    for (const hook of beforeRollbackHooks) {
      if (transaction.processingHooks.has(hook)) { return }
      transaction.processingHooks.add(hook)
      // eslint-disable-next-line no-await-in-loop
      await hook(opts)
    }
  }

  if (transaction.isCompleted()) {
    const { kmoreTrxId, scope } = transaction
    kmore.removeTrxIdCache(kmoreTrxId, scope)

    if (afterRollbackHooks.length) {
      for (const hook of afterRollbackHooks) {
        if (transaction.processingHooks.has(hook)) { return }
        transaction.processingHooks.add(hook)
        // eslint-disable-next-line no-await-in-loop
        await hook(opts)
      }
    }
  }

  return new Promise((resolve, reject) => {
    // NOTE: `await` not work here, even though it return a promise, so use `new Promise()`
    // @ts-ignore _ori_rollback
    Reflect.apply(transaction[KmoreProxyKey._ori_rollback] as AsyncMethodType, transaction, [])
      .then(async () => {
        if (afterRollbackHooks.length) {
          for (const hook of afterRollbackHooks) {
            // eslint-disable-next-line no-await-in-loop
            await hook(opts)
          }
        }

        const { kmoreTrxId, scope } = transaction
        kmore.removeTrxIdCache(kmoreTrxId, scope)

        resolve()
      }).catch(reject)
  })
}

