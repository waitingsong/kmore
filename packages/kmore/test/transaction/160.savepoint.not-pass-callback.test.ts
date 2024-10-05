import assert from 'node:assert'

import { fileShortPath, sleep } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import type { KmoreTransaction } from '##/index.js'
import { KmoreFactory } from '##/index.js'
import { config } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'

import { updateWithoutTrx } from './helper.js'


describe(fileShortPath(import.meta.url), () => {
  const dict = genDbDict<Db>()
  const km = KmoreFactory({ config, dict })

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    if (km.dbh?.destroy) {
      await km.dbh.destroy() // !
    }
  })

  beforeEach(async () => {
    await updateWithoutTrx(km, new Date())
  })
  describe('Should savepoint(arg) arg not support function', () => {
    it('should throw error when pass function', async () => {
      const trx = await km.transaction()


      const trxPoint = await trx.savepoint<KmoreTransaction>(async (trx2) => {
        await trx2.rollback()
        assert(trx2.isCompleted(), 'trx2.isCompleted()')
      })
      assert(trxPoint.isCompleted(), 'trxPoint.isCompleted()')

      assert(! trx.isCompleted(), '! trx.isCompleted()')
      await trx.rollback()
      assert(trx.isCompleted(), 'trx.isCompleted()')
    })

  })
})

