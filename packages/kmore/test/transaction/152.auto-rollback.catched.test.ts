import assert from 'node:assert'

import { fileShortPath, sleep } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory } from '##/index.js'
import { config } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'

import { currCtime, newTime1 } from './date.js'
import { read, readInvalid, readWithoutThen, update, updateWithoutTrx } from './helper.js'


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

  describe('Should auto rollback work on error', () => {
    it('error from .then()', async () => {
      const trx = await km.transaction({ trxActionOnEnd: 'rollback' })
      assert(trx)

      try {
        await update(km, trx, newTime1)
        await readWithoutThen(km, trx)
          .then(() => {
            return Promise.reject('debug test error')
          })
      }
      catch (ex) {
        assert(ex instanceof Error)
        assert(! trx.isCompleted())

        const currCtime2 = await read(km)
        assert(currCtime2)
        assert(currCtime === currCtime2, `time1: ${currCtime}, time2: ${currCtime2}`)
        return
      }
      finally {
        await trx.rollback()
      }
      assert(false, 'Should throw error')
    })

    it('rollback by invalid sql query always, although auto commit. with tailing then()', async () => {
      const trx = await km.transaction({ trxActionOnEnd: 'rollback' })
      assert(trx)

      try {
        await update(km, trx, newTime1)
        await readInvalid(km, trx)
          .then()
      }
      catch (ex) {
        assert(ex instanceof Error)
        assert(trx.isCompleted(), 'trx.isCompleted() error')

        const currCtime2 = await read(km)
        assert(currCtime2)
        assert(currCtime === currCtime2, `time1: ${currCtime}, time2: ${currCtime2}`)
        return
      }
      finally {
        await trx.rollback()
      }

      assert(false, 'Should error be catched, but not')
    })

    it('rollback by invalid sql query always, although auto commit. without tailing then()', async () => {
      const trx = await km.transaction({ trxActionOnEnd: 'rollback' })
      assert(trx)

      try {
        await update(km, trx, newTime1)
        await readInvalid(km, trx)
      }
      catch (ex) {
        assert(ex instanceof Error)
        assert(trx.isCompleted())

        const currCtime2 = await read(km)
        assert(currCtime2)
        assert(currCtime === currCtime2, `time1: ${currCtime}, time2: ${currCtime2}`)
        return
      }
      finally {
        await trx.rollback()
      }

      assert(false, 'Should error be catched, but not')
    })

    it('reuse tbUser', async () => {
      const trx = await km.transaction({ trxActionOnEnd: 'rollback' })
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
        assert(trx.isCompleted())
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

