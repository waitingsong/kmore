import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory } from '##/index.js'
import type { BuilderTransactingHookOptions, Kmore, KmoreTransaction } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'


const flag = 1

describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>
  let trx: KmoreTransaction

  before(async () => {
    km = KmoreFactory({
      config: config, dict: dbDict,
      hookList: {
        builderTransactingPreHooks: [processor],
        builderTransactingPostHooks: [processor2],
      },
    })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)

    trx = await km.transaction()
  })

  after(async () => {
    await trx.rollback()
    await km.dbh.destroy() // !
  })

  describe('builderTransactingPreHooks, builderTransactingPostHooks', () => {
    it('normal', async () => {
      const { tb_user } = km.refTables
      const ret = await tb_user().select('*').transacting(trx)
      assert(ret)
    })
  })

})

const random = Math.random()

function processor(options: BuilderTransactingHookOptions): void {
  const { kmore, builder, trx } = options
  assert(kmore)
  assert(builder)
  assert(trx)
  assert(! trx.isCompleted())

  void Object.defineProperty(builder, 'foo', {
    value: random,
  })
}


function processor2(options: BuilderTransactingHookOptions): void {
  const { kmore, builder, trx } = options
  assert(kmore)
  assert(builder)
  assert(trx)
  assert(! trx.isCompleted())

  // @ts-expect-error
  assert(builder.foo === random)
}

