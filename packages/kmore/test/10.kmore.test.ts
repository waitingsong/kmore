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

  describe('Should read table with tables param in object works', () => {
    it('tb_user', async () => {
      const tbUser = km.refTables.ref_tb_user()
      const ret = await tbUser.select('*')

      assert(ret && Array.isArray(ret))
      assert(ret.length === 2)
    })

    it('where', async () => {
      const tbUser = km.refTables.ref_tb_user()
      const ret = await tbUser.select('*')
        .where('uid', 1)
      assert(ret && Array.isArray(ret))
      assert(ret.length === 1)
    })

    it('transaction', async () => {
      const { dbh } = km
      const trx = await dbh.transaction()
      const tbUser = km.refTables.ref_tb_user()
      const ret = await tbUser
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
      assert(ret && Array.isArray(ret))
      assert(ret.length === 1)
    })

    it('subscription', (done) => {
      km.refTables.ref_tb_user()
        .select('*')
        .where('uid', 1)
        .catch(() => [])

      let queryUid = ''
      const subsp = globalEvent
        .subscribe({
          next: (ev) => {

            if (ev.identifier) { return }

            assert(ev.type === 'queryResponse' || ev.type === 'query')

            if (ev.type === 'query') {
              assert(ev.queryUid.length)
              assert(queryUid === '', ev.queryUid)
              queryUid = ev.queryUid
            }
            else if (ev.type === 'queryResponse') {
              const ret = ev.respRaw && ev.respRaw.response ? ev.respRaw.response.rows : null

              assert(ret && Array.isArray(ret))
              assert(ret && ret.length === 1)
              assert(ev.queryUid && ev.queryUid === queryUid)

              subsp.unsubscribe()
              done()
            }
          },
          error: done,
        })
      assert(typeof subsp.unsubscribe === 'function')
    })

  })

})

