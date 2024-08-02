/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert'

import type { MethodTypeUnknown } from '@waiting/shared-types'

import type { KmoreQueryBuilder } from '../builder/builder.types.js'
import { defaultPropDescriptor } from '../config.js'
import type { CreateProxyThenOptions, ProxyThenRunnerOptions } from '../kmore.js'
import type { KmoreTransaction } from '../types.js'
import { KmoreProxyKey } from '../types.js'


/**
 * Create a proxy for `transacting` method on QueryBuilder
 */
export function createProxyTransacting(options: CreateProxyThenOptions): void {
  const { builder } = options

  // @ts-ignore
  if (! builder[KmoreProxyKey._ori_transacting]) {
    void Object.defineProperty(builder, KmoreProxyKey._ori_transacting, {
      ...defaultPropDescriptor,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      value: builder.transacting,
    })

    void Object.defineProperty(builder, KmoreProxyKey.transacting, {
      ...defaultPropDescriptor,
      writable: true,
      value: (transaction: KmoreTransaction) => _proxyTransacting({
        ...options,
        transaction,
        done: void 0,
        reject: void 0,
      }),
    })
  }
}


function _proxyTransacting(options: ProxyThenRunnerOptions): KmoreQueryBuilder {
  const { kmore, builder, transaction: trx } = options

  assert(trx, 'proxyTransacting(): transaction must be provided')

  const { kmoreTrxId } = trx
  assert(kmoreTrxId, 'trx.kmoreTrxId must be provided when .transacting(trx)')

  assert(trx.isTransaction === true, 'trx must be a transaction')
  assert(! trx.isCompleted(), 'Transaction already completed, may committed or rollback already. trxId: ' + kmoreTrxId.toString())

  const queryId = builder.kmoreQueryId
  assert(queryId, 'trx.kmoreQueryId must be provided when .transacting(trx)')
  kmore.linkQueryIdToTrxId(queryId, kmoreTrxId)

  const scope = trx.scope ?? builder.scope
  scope && kmore.linkTrxIdToScope(kmoreTrxId, scope)

  // @ts-ignore
  return Reflect.apply(builder[KmoreProxyKey._ori_transacting] as MethodTypeUnknown, builder, [trx]) as KmoreQueryBuilder
}

