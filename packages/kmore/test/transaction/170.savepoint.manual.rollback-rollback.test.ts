import assert from 'node:assert'

import { fileShortPath, sleep } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory, KmoreTransaction, TrxControl } from '##/index.js'
import { config } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'

import {
  date0,
  date1,
  date2,
  newTime0,
  newTime1,
  newTime2,
} from './date.js'
import { read, restore, update, updateWithoutTrx } from './helper.js'


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

  describe('Should savepoint() work', () => {
    it('normal', async () => {
      const trx = await km.transaction({ trxActionOnError: TrxControl.Rollback })
      assert(trx)
      assert(trx.trxActionOnError === TrxControl.Rollback)

      const t1u = await update(km, trx, newTime1)
      console.log({ t1u, file: fileShortPath(import.meta.url) })
      assert(t1u === date1)

      const t1a = await read(km)
      assert(t1a === date0, `t1a: ${t1a}, date0: ${date0}`)

      const trx2 = await trx.savepoint()
      assert(trx2)
      assert(trx2.isTransaction)
      assert(! trx.isCompleted())
      assert(! trx2.isCompleted())

      const t2a = await read(km)
      assert(t2a === date0)

      const t2b = await read(km, trx)
      assert(t2b === date1)

      const t2c = await read(km, trx2)
      assert(t2c === date1)

      const t21u = await update(km, trx2, newTime2)
      assert(t21u === date2)

      const t21a = await read(km)
      assert(t21a === date0)

      const t21b = await read(km, trx)
      assert(t21b === date2, `t21b: ${t21b}, date2: ${date2}`)

      const t21c = await read(km, trx2)
      assert(t21c === date2, 't21c: ' + t21c)

      await trx2.rollback() // ---------

      const t3a = await read(km)
      assert(t3a === date0)

      const t3b = await read(km, trx)
      assert(t3b === date1, `t3b: ${t3b}, date1: ${date1}`)

      await trx.rollback() // ---------

      const t4a = await read(km)
      assert(t4a === date0, `t4a: ${t4a}, date1: ${date0}`)

      await restore(km, newTime0)
      assert(true)
    })

  })
})

