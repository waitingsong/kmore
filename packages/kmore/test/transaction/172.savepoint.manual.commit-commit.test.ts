import assert from 'node:assert'

import { fileShortPath, sleep } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory, TrxControl } from '##/index.js'
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

      await trx2.commit() // ---------

      const t3a = await read(km)
      assert(t3a === date0)

      const t3b = await read(km, trx)
      assert(t3b === date2, `t3b: ${t3b}, date2: ${date2}`)

      await trx.commit() // ---------

      const t4a = await read(km)
      if (t4a === date2) {
        await restore(km, newTime0)
        return
      }

      try {
        await sleep(1500)
        const t4b = await read(km)
        console.warn('Retry after 1s: ', t4b)
        assert(t4b === date2, `t4b: ${t4b}, expect: ${date2}`)
      }
      catch (ex) {
        await sleep(3000)
        const t4c = await read(km)
        console.warn('Retry2 after 1s: ', t4c)
        assert(t4c === date2, `t4c: ${t4c}, expect: ${date2}`)
      }

    })

  })
})

