import assert from 'node:assert/strict'

import { fileShortPath, sleep } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { Kmore, KmoreFactory, KmoreTransaction } from '../../src/index.js'
import { config } from '../test.config.js'
import { Db } from '../test.model.js'

import { read, restore, update, updateWithoutTrx } from './helper.js'


describe(fileShortPath(import.meta.url), () => {
  const dict = genDbDict<Db>()
  const km = KmoreFactory({ config, dict })

  const date0 = new Date().toLocaleDateString()
  const currCtime = date0
  const date1 = '3000/1/1'
  const date2 = '3000/1/2'
  const newTime0 = new Date()
  const newTime1 = new Date(date1)
  const newTime2 = new Date(date2)

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    if (km.dbh && km.dbh.destroy) {
      await km.dbh.destroy() // !
    }
  })

  beforeEach(async () => {
    await updateWithoutTrx(km, new Date())
  })

  describe('Should savepoint() work', () => {
    it('normal', async () => {
      const trx = await km.transaction(void 0, { trxActionOnEnd: 'rollback' })
      assert(trx)
      assert(trx.trxActionOnEnd === 'rollback')

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
      assert(t4a === date2, `t4a: ${t4a}, date2: ${date2}`)

      await restore(km, newTime0)
      assert(true)
    })

  })
})

