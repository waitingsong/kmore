import type { CreateProxyTrxOptions, CreateProxyThenOptions } from '../kmore.js'
import type { KmoreTransaction } from '../types.js'

import { createProxyCommit } from './proxy.commit.js'
import { createProxyRollback } from './proxy.rollback.js'
import { createProxySavepoint } from './proxy.savepoint.js'
import { createProxyThen } from './proxy.then.js'
import { createProxyTransacting } from './proxy.transacting.js'
import { updateTrxProperties } from './proxy.trx.helper.js'


export function createQueryBuilderProxy(options: CreateProxyThenOptions): void {
  createProxyThen(options)
  createProxyTransacting(options)
}

export function createTrxProxy(options: CreateProxyTrxOptions): KmoreTransaction {
  updateTrxProperties(options)
  let trx = createProxyCommit(options)
  trx = createProxyRollback(options)
  trx = createProxySavepoint(options)

  return trx
}

