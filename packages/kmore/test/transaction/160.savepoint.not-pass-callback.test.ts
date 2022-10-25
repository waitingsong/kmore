import assert from 'node:assert/strict'

import { fileShortPath, sleep } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory } from '../../src/index.js'
import { config } from '../test.config.js'
import { Db } from '../test.model.js'

import { read, readInvalid, readWithoutThen, update, updateWithoutTrx } from './helper.js'


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
  describe('Should savepoint(arg) arg not support function', () => {
    it('should throw error when pass function', async () => {
      const trx = await km.transaction()
      assert(trx)

      try {
        await trx.savepoint(async (trx2) => {
          await trx2.rollback()
        })
      }
      catch (ex) {
        assert(ex instanceof Error)
        assert(ex.message.includes('trx.savepoint(arg) arg not support function'))
        void trx.rollback()
        return
      }

      assert(false, 'Should not reach here')
    })

  })
})

