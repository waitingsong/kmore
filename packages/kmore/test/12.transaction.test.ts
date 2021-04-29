import { basename } from '@waiting/shared-core'
import { JsonObject } from '@waiting/shared-types'

import {
  kmoreFactory,
  genDbDict,
  OnQueryData,
  OnQueryErrorData,
  OnQueryErrorErr,
  OnQueryRespRaw,
  QueryResponse,
} from '../src/index'

import { config } from './test.config'
import { Db } from './test.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {
  const dict = genDbDict<Db>()
  const km = kmoreFactory({ config, dict })

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    if (km.dbh && km.dbh.destroy) {
      await km.dbh.destroy() // !
    }
  })

  describe('Should transaction works', () => {
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

      const tbUser2 = km.refTables.ref_tb_user()
      const ret2 = await tbUser2
        .select('*')
        .catch(() => {
          void trx.rollback()
          return []
        })
      assert(ret2 && Array.isArray(ret2))
    })

    it('transaction subscription', (done) => {
      const { dbh } = km
      const id = Symbol('trans-subscription')

      dbh.transaction()
        .then((trx) => {
          const subsp = km.register(ev => ev.identifier === id)
            .subscribe({
              next: (ev) => {
                assert(ev.identifier === id)
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

                  const rows = ev.respRaw ? ev.respRaw.response.rows : null
                  assert(rows && Array.isArray(rows))
                  assert(rows && rows.length === 1)

                  subsp.unsubscribe()
                  done()
                }
              },
              error: done,
            })
          assert(typeof subsp.unsubscribe === 'function')

          km.refTables.ref_tb_user(id)
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
          assert(false, ex)
          done()
        })
    })
  })

})

