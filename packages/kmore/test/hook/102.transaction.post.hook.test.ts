import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { type Kmore, type TransactionHookOptions, KmoreFactory } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'


const scope1 = Symbol('test-scope1')
const scope2 = Symbol('test-scope2')

describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>

  before(() => {
    km = KmoreFactory({
      config: config, dict: dbDict,
      hookList: {
        transactionPostHooks: [processor, processor2],
      },
    })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('transactionPostHook', () => {
    it('normal', async () => {
      const trx = await km.transaction()
      assert(trx, 'trx undefined')
      assert(! trx.isCompleted(), 'trx.isCompleted() true')
      assert(trx.scope === scope1, 'trx.scope !== scope1')
      await trx.rollback()
    })

    it('config.scope', async () => {
      const trx = await km.transaction({ scope: scope2 })
      assert(trx, 'trx undefined')
      assert(! trx.isCompleted(), 'trx.isCompleted() true')
      assert(trx.scope === scope2, 'trx.scope !== scope2')
      await trx.rollback()
    })
  })

})


async function processor(options: TransactionHookOptions): Promise<TransactionHookOptions> {
  const { kmore, trx } = options
  assert(kmore, 'kmore undefined')
  assert(kmore.dict, 'kmore.dict undefined')
  assert(trx, 'trx undefined')
  assert(trx.isTransaction, 'trx.isTransaction false')

  if (! trx.scope) {
    trx.scope = scope1
  }

  return options
}
async function processor2(options: TransactionHookOptions): Promise<TransactionHookOptions> {
  const { kmore, trx } = options
  assert(kmore, 'kmore undefined')
  assert(kmore.dict, 'kmore.dict undefined')
  assert(trx, 'trx undefined')
  assert(trx.isTransaction, 'trx.isTransaction false')

  const { scope } = trx
  assert(scope === scope1 || scope === scope2, 'scope !== scope1 && scope !== scope2')

  return options
}

