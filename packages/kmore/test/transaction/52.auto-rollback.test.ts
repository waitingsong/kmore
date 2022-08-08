import assert from 'node:assert/strict'

import { fileShortPath, sleep } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory } from '../../src/index.js'
import { config } from '../test.config.js'
import { Db } from '../test.model.js'


describe(fileShortPath(import.meta.url), () => {
  const dict = genDbDict<Db>()
  const km = KmoreFactory({ config, dict })

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    if (km.dbh && km.dbh.destroy) {
      await km.dbh.destroy() // !
    }
  })

  describe('Should auto rollback work on error', () => {
    it('catch error from .then()', async () => {
      const trx = await km.transaction(void 0, { trxActionOnError: 'rollback' })
      assert(trx)

      const currCtime = await km.camelTables.ref_tb_user()
        .select('*')
        .where('uid', 1)
        .then(rows => rows[0]?.ctime)
      assert(currCtime)

      await sleep(1000)
      const newTime = new Date()

      try {
        await km.camelTables.ref_tb_user()
          .transacting(trx)
          .forUpdate()
          .update({
            ctime: newTime,
          })
          .where('uid', 1)

        await km.camelTables.ref_tb_user()
          .transacting(trx)
          .forUpdate()
          .select('*')
          .where('uid', 1)
          .then(() => {
            return Promise.reject('debug test error')
          })
      }
      catch (ex) {
        assert(trx.isCompleted() === true)

        const currCtime2 = await km.camelTables.ref_tb_user()
          .select('*')
          .where('uid', 1)
          .then(rows => rows[0]?.ctime)
        assert(currCtime2)

        const str1 = currCtime.toLocaleString()
        const str2 = currCtime2.toLocaleString()
        assert(str1 === str2)
        const str3 = newTime?.toLocaleString()
        assert(str2 !== str3)
        return
      }
      assert(false, 'Should throw error')
    })

    it('with savepoint: catch error from .then()', async () => {
      const trx = await km.transaction(void 0, { trxActionOnError: 'rollback' })
      assert(trx)

      const currCtime = await km.camelTables.ref_tb_user()
        .select('*')
        .where('uid', 1)
        .then(rows => rows[0]?.ctime)
      assert(currCtime)

      const newTime = new Date()

      try {
        await km.camelTables.ref_tb_user()
          .transacting(trx)
          .forUpdate()
          .update({
            ctime: newTime,
          })
          .where('uid', 1)

        await trx.savepoint(async (trx1) => {
          await trx1.commit()
        })

        await km.camelTables.ref_tb_user()
          .transacting(trx)
          .forUpdate()
          .select('*')
          .where('uid', 1)
          .then(() => {
            return Promise.reject('debug test error')
          })
      }
      catch (ex) {
        assert(trx.isCompleted() === true)

        const currCtime2 = await km.camelTables.ref_tb_user()
          .select('*')
          .where('uid', 1)
          .then(rows => rows[0]?.ctime)
        assert(currCtime2)

        const str1 = currCtime.toLocaleString()
        const str2 = currCtime2.toLocaleString()
        assert(str1 === str2)
        const str3 = newTime?.toLocaleString()
        assert(str2 !== str3)
        return
      }
      assert(false, 'Should throw error')
    })

    it('rollback by db server always although auto commit', async () => {
      const trx = await km.transaction(void 0, { trxActionOnError: 'rollback' })
      assert(trx)

      const currCtime = await km.camelTables.ref_tb_user()
        .select('*')
        .where('uid', 1)
        .then(rows => rows[0]?.ctime)
      assert(currCtime)

      const newTime = new Date()

      try {
        await km.camelTables.ref_tb_user()
          .transacting(trx)
          .forUpdate()
          .update({
            ctime: newTime,
          })
          .where('uid', 1)

        await km.camelTables.ref_tb_user()
          .transacting(trx)
          .forUpdate()
          .select('*')
          .where('fake', 1)
      }
      catch (ex) {
        assert(trx.isCompleted() === true)

        const currCtime2 = await km.camelTables.ref_tb_user()
          .select('*')
          .where('uid', 1)
          .then(rows => rows[0]?.ctime)
        assert(currCtime2)

        const str1 = currCtime.toLocaleString()
        const str2 = currCtime2.toLocaleString()
        assert(str1 === str2)
        const str3 = newTime?.toLocaleString()
        assert(str2 !== str3)
        return
      }
      assert(false, 'Should throw error')
    })

    it('reuse tbUser', async () => {
      const trx = await km.transaction(void 0, { trxActionOnError: 'rollback' })
      assert(trx)

      const currCtime = await km.camelTables.ref_tb_user()
        .select('*')
        .where('uid', 1)
        .then(rows => rows[0]?.ctime)
      assert(currCtime)

      const newTime = new Date()

      const tbUser = km.camelTables.ref_tb_user()
      try {
        await tbUser
          .transacting(trx)
          .forUpdate()
          .select('*')
          .update({
            ctime: newTime,
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
            .select('*')
            .where('uid', 1)
            .then(rows => rows[0])
        }
        catch {
          assert(true)
          return
        }
      }
      assert(false, 'Should throw error')
    })
  })

})

