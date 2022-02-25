import assert from 'assert/strict'
import { relative } from 'path'

import { genDbDict } from 'kmore-types'

import { globalEvent, kmoreFactory } from '../src/index'

import { config } from './test.config'
import { Db } from './test.model'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {
  const dict = genDbDict<Db>()
  const km = kmoreFactory({ config, dict }, true)

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
      const trx = await dbh.transaction()
      const tbUser = km.refTables.ref_tb_user()
      const uid2 = 2
      const ret = await tbUser
        .transacting(trx)
        .forUpdate()
        .update('uid', 99)
        .where('uid', uid2)
        .returning('uid')
        .then((uids) => {
          assert(uids, uids.toString())
          assert(uids.length === 1, uids.toString())
          assert(uids[0] === uid2)
        })

      await trx.rollback()

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
    })

    it('transaction subscription', (done) => {
      const { dbh } = km

      dbh.transaction()
        .then((trx) => {
          const subsp = globalEvent
            .subscribe({
              next: (ev) => {
                assert(ev.kUid)
                assert(ev.queryUid)
                assert(typeof ev.trxId === 'string' && ev.trxId)
                assert(ev.method === 'select')

                if (ev.type === 'query') {
                  assert(! ev.command)
                  assert(typeof ev.exData === 'undefined')
                  assert(typeof ev.exError === 'undefined')
                  assert(typeof ev.respRaw === 'undefined')
                }
                else if (ev.type === 'queryResponse') {
                  assert(ev.command === 'SELECT')
                  assert(ev.respRaw)

                  const rows = ev.respRaw && ev.respRaw.response ? ev.respRaw.response.rows : null

                  assert(rows && Array.isArray(rows))
                  assert(rows && rows.length === 1)

                  subsp.unsubscribe()
                  done()
                }
              },
              error: done,
            })
          assert(typeof subsp.unsubscribe === 'function')

          km.refTables.ref_tb_user()
            .transacting(trx)
            .forUpdate()
            .select('*')
            .where('uid', 1)
            .then((rows) => {
              void trx.commit()
              return rows
            })
            .catch(() => {
              void trx.rollback()
              return []
            })

        })
        .catch((ex) => {
          assert(false, (ex as Error).message)
          done()
        })
    })
  })

})

