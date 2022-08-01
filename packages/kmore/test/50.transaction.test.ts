import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory } from '../src/index.js'

import { config } from './test.config.js'
import { Db } from './test.model.js'


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

  describe('Should transaction work', () => {
    it('transaction', async () => {
      const { dbh } = km
      const trx = await dbh.transaction()
      assert(trx)
      const tbUser = km.refTables.ref_tb_user()
      const ret = await tbUser
        .transacting(trx)
        .forUpdate()
        .select('*')
        .where('uid', 1)
        .then()

      await trx.commit()
      assert(ret && Array.isArray(ret))
      assert(ret.length === 1)
    })

    it('transaction rollback', async () => {
      const { dbh } = km

      let trx = await dbh.transaction()
      assert(trx)
      let tbUser = km.refTables.ref_tb_user()

      const uidsAll = await tbUser
        .select('*')
        .then()
      assert(uidsAll)
      assert(uidsAll.length === 3)

      const uid2 = 2
      const uid99 = 99
      await tbUser
        .transacting(trx)
        .forUpdate()
        .update('uid', uid99)
        .where('uid', uid2)
        .returning('uid')
        .then((uids) => {
          assert(uids, uids.toString())
          assert(uids.length === 1, uids.toString())
          const row = uids[0] as unknown as {uid: number}
          assert(row)
          assert(row.uid === uid99)
        })
      const uidsAll2 = await tbUser
        .select('*')
        .then()
      assert(uidsAll2)
      assert(uidsAll2.length === 0)
      await trx.rollback()

      tbUser = km.refTables.ref_tb_user()
      const uidsAll3 = await tbUser
        .select('*')
        .then()
      assert(uidsAll3)
      assert(uidsAll3)
      assert(uidsAll3.length === 3)

      tbUser = km.refTables.ref_tb_user()
      trx = await dbh.transaction()
      assert(trx)
      const ret2 = await tbUser
        .transacting(trx)
        .forUpdate()
        .select('*')
        .where('uid', 1)
        .then()
      assert(ret2 && Array.isArray(ret2))
      assert(ret2.length === 1)

      const ret3 = await tbUser
        .transacting(trx)
        .forUpdate()
        .select('*')
        .where('uid', uid2)
        .then()
      assert(ret3 && Array.isArray(ret3))
      assert(ret3.length === 0)

      await trx.rollback()
    })

    // it('transaction subscription', (done) => {
    //   const { dbh } = km

    //   dbh.transaction()
    //     .then((trx) => {
    //       const subsp = globalEvent
    //         .subscribe({
    //           next: (ev) => {
    //             assert(ev.kUid)
    //             assert(ev.queryUid)
    //             assert(typeof ev.trxId === 'string' && ev.trxId)
    //             assert(ev.method === 'select')

    //             if (ev.type === 'query') {
    //               assert(! ev.command)
    //               assert(typeof ev.exData === 'undefined')
    //               assert(typeof ev.exError === 'undefined')
    //               assert(typeof ev.respRaw === 'undefined')
    //             }
    //             else if (ev.type === 'queryResponse') {
    //               assert(ev.command === 'SELECT')
    //               assert(ev.respRaw)

    //               const rows = ev.respRaw && ev.respRaw.response ? ev.respRaw.response.rows : null

    //               assert(rows && Array.isArray(rows))
    //               assert(rows && rows.length === 1)

    //               subsp.unsubscribe()
    //               done()
    //             }
    //           },
    //           error: done,
    //         })
    //       assert(typeof subsp.unsubscribe === 'function')

    //       km.refTables.ref_tb_user()
    //         .transacting(trx)
    //         .forUpdate()
    //         .select('*')
    //         .where('uid', 1)
    //         .then(async (rows) => {
    //           await trx.commit()
    //           return rows
    //         })
    //         .catch(async () => {
    //           await trx.rollback()
    //           return []
    //         })

    //     })
    //     .catch((ex) => {
    //       assert(false, (ex as Error).message)
    //       done()
    //     })
    // })
  })

})

