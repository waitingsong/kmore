import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory } from '##/index.js'
import type { TransactionHookOptions, Kmore } from '##/index.js'
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
        beforeRollbackHooks: [processor, processor2],
        afterRollbackHooks: [processor3],
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
      await trx.rollback()
      assert(trx.isCompleted(), 'trx.isCompleted() not true')
      assert(trx.scope === scope1, 'trx.scope !== scope1')
    })
  })

})


async function processor(options: TransactionHookOptions): Promise<void> {
  const { kmore, trx } = options
  assert(kmore, 'kmore undefined')
  assert(trx, 'trx undefined')
  assert(trx.isTransaction, 'trx.isTransaction false')

  if (! trx.scope) {
    trx.scope = scope1
  }

  assert(! trx.isCompleted(), 'trx.isCompleted() not false')
  await trx.rollback()
  assert(! trx.isCompleted(), 'trx.isCompleted() not false') // <-- uncompleted yet !
}

async function processor2(options: TransactionHookOptions): Promise<void> {
  const { kmore, trx } = options
  assert(! trx.isCompleted(), 'trx.isCompleted() not false') // <-- uncompleted yet !
  await trx.rollback()
  assert(! trx.isCompleted(), 'trx.isCompleted() not false') // <-- uncompleted yet !
}

async function processor3(options: TransactionHookOptions): Promise<void> {
  const { kmore, trx } = options
  assert(kmore, 'kmore undefined')
  assert(trx, 'trx undefined')
  assert(trx.isTransaction, 'trx.isTransaction false')

  const { scope } = trx
  assert(scope === scope1 || scope === scope2, 'scope !== scope1 && scope !== scope2')

  assert(trx.isCompleted(), 'trx.isCompleted() not true')
}

