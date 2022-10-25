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

  describe('Should auto default(rollback) work on error', () => {
    it('catch rejection from .then()', async () => {
      const trx = await km.transaction()
      assert(trx)

      try {
        await update(km, trx, newTime1)

        // NOTE: error from builder or ONLY fisrt builder.then() can be catched !
        await readWithoutThen(km, trx)
          .then(() => {
            return Promise.reject('debug test error')
          })
      }
      catch (ex) {
        // NOTE: error from ONLY fisrt builder.then() can be catched !
        assert(trx.isCompleted())

        const currCtime2 = await read(km)
        assert(currCtime2)

        const str1 = currCtime.toLocaleString()
        const str2 = currCtime2.toLocaleString()
        assert(str1 === str2, `str1: ${str1}, str2: ${str2}`)
        assert(str2 !== date1, `str2: ${str2}, date1: ${date1}`)
        return
      }
      finally {
        await trx.rollback()
      }
      assert(false, 'Should throw error')
    })

    it('rollback by invalid sql query always, although auto commit. with tailing then()', async () => {
      const trx = await km.transaction()
      assert(trx)

      try {
        await update(km, trx, newTime1)

        // NOTE: error from ONLY fisrt builder.then() can be catched !
        await readInvalid(km, trx)
          .then()
      }
      catch (ex) {
        // NOTE: error from ONLY fisrt builder.then() can be catched !
        assert(trx.isCompleted(), 'trx.isCompleted() error')

        const currCtime2 = await read(km)
        assert(currCtime2)

        const str1 = currCtime.toLocaleString()
        const str2 = currCtime2.toLocaleString()
        assert(str1 === str2, `str1: ${str1}, str2: ${str2}`)
        assert(str2 !== date1, `str2: ${str2}, date1: ${date1}`)
        return
      }
      finally {
        await trx.rollback()
      }

      assert(false, 'Should error be catched, but not')
    })

    it('rollback by invalid sql query always, although auto commit. without tailing then()', async () => {
      const trx = await km.transaction()
      assert(trx)

      try {
        await update(km, trx, newTime1)
        await readInvalid(km, trx)
      }
      catch (ex) {
        assert(trx.isCompleted() === true)

        const currCtime2 = await read(km)
        assert(currCtime2)

        const str1 = currCtime.toLocaleString()
        const str2 = currCtime2.toLocaleString()
        assert(str1 === str2)
        assert(str2 !== date1, `str2: ${str2}, date1: ${date1}`)
        return
      }
      finally {
        await trx.rollback()
      }

      assert(false, 'Should error be catched, but not')
    })

    it('reuse tbUser', async () => {
      const trx = await km.transaction()
      assert(trx)

      const tbUser = km.camelTables.ref_tb_user()
      try {
        await tbUser
          .transacting(trx)
          .forUpdate()
          .select('*')
          .update({
            ctime: newTime1,
          })
          .where('uid', 1)

        // resuse tbuser
        await tbUser
          .transacting(trx)
          .forUpdate()
          .select('*')
          .where('fake', 1)
      }
      catch (ex) {
        assert(trx.isCompleted() === true)
        try {
          // reuse tbUser will fail
          await tbUser
            .first()
            .where('uid', 1)
        }
        catch {
          assert(true)
          return
        }
        finally {
          await trx.rollback()
        }
      }
      finally {
        await trx.rollback()
      }

      assert(false, 'Should throw error')
    })
  })

})

