import assert from 'node:assert'

import { fileShortPath, sleep } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory, TrxControl } from '##/index.js'
import { config } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'

import { currCtime, date1, newTime1, nowTime } from './date.js'
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

  describe('Should auto commit work on error', () => {
    it('rejection from .then()', async () => {
      const trx = await km.transaction({ trxActionOnError: TrxControl.Commit })
      assert(trx)
      const msg = 'debug test error'

      try {
        await update(km, trx, newTime1)
        await readWithoutThen(km, trx)
          .then(() => {
            return Promise.reject(new Error(msg))
          })
      }
      catch (ex) {
        assert(ex instanceof Error)
        assert(ex.message === msg, ex.message)
        assert(trx.isCompleted())

        const currCtime2 = await read(km)
        assert(currCtime2)
        assert(currCtime2 === date1, `currTime: ${currCtime2}, expect: ${date1}`)
        return
      }
      finally {
        await trx.rollback()
        await updateWithoutTrx(km, nowTime)
      }
      assert(false, 'Should throw error')
    })

    it('rollback by invalid sql query always, although auto commit. with tailing then()', async () => {
      const trx = await km.transaction({ trxActionOnError: TrxControl.Commit })
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
        assert(currCtime2 === currCtime, `currTime2: ${currCtime2}, expect: ${currCtime}`)
        return
      }
      finally {
        await trx.rollback()
      }

      assert(false, 'Should error be catch, but not')
    })

    it('rollback by invalid sql query always, although auto commit. without tailing then()', async () => {
      const trx = await km.transaction({ trxActionOnError: TrxControl.Commit })
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
        assert(currCtime2 === currCtime, `currTime2: ${currCtime2}, expect: ${currCtime}`)
        return
      }
      finally {
        await trx.rollback()
      }

      assert(false, 'Should error be catch, but not')
    })

    it('reuse tbUser', async () => {
      const trx = await km.transaction({ trxActionOnError: TrxControl.Commit })
      assert(trx)

      const tbUser = km.camelTables.tb_user()
      try {
        await tbUser
          .transacting(trx)
          .forUpdate()
          .select('*')
          .update({
            ctime: newTime1,
          })
          .where('uid', 1)

        // reuse tbUser
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
        await updateWithoutTrx(km, nowTime)
      }

      assert(false, 'Should throw error')
    })
  })

})

