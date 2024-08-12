import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { type TransactionHookOptions, type Kmore, KmoreFactory } from '##/index.js'
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
        beforeCommitHooks: [processor, processor2],
        afterCommitHooks: [processor3],
      },
    })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('transaction commit hooks', () => {
    it('normal', async () => {
      const trx = await km.transaction()
      assert(trx, 'trx undefined')
      await trx.commit()
      assert(trx.isCompleted(), 'trx.isCompleted() not true')
      assert(trx.scope === scope1, 'trx.scope !== scope1')
    })
  })

})


async function processor(options: TransactionHookOptions): Promise<TransactionHookOptions> {
  const { kmore, trx } = options
  assert(kmore, 'kmore undefined')
  assert(trx, 'trx undefined')
  assert(trx.isTransaction, 'trx.isTransaction false')

  if (! trx.scope) {
    trx.scope = scope1
  }

  assert(! trx.isCompleted(), 'trx.isCompleted() not false')
  await trx.commit()
  assert(! trx.isCompleted(), 'trx.isCompleted() not false') // <-- uncompleted yet !
  return options
}

async function processor2(options: TransactionHookOptions): Promise<TransactionHookOptions> {
  const { kmore, trx } = options
  assert(! trx.isCompleted(), 'trx.isCompleted() not false') // <-- uncompleted yet !
  await trx.commit()
  assert(! trx.isCompleted(), 'trx.isCompleted() not false') // <-- uncompleted yet !
  return options
}

async function processor3(options: TransactionHookOptions): Promise<TransactionHookOptions> {
  const { kmore, trx } = options
  assert(kmore, 'kmore undefined')
  assert(trx, 'trx undefined')
  assert(trx.isTransaction, 'trx.isTransaction false')

  const { scope } = trx
  assert(scope === scope1 || scope === scope2, 'scope !== scope1 && scope !== scope2')

  assert(trx.isCompleted(), 'trx.isCompleted() not true')
  return options
}
