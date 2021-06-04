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

    it('subscription with id', (done) => {
      const id = Symbol('subscription')
      km.refTables.ref_tb_user(id)
        .select('*')
        .where('uid', 2)
        // .on('query', (data: OnQueryData) => {
        //   console.log(data)
        // })
        // .on('query-response', (resp: QueryResponse, raw: OnQueryRespRaw) => {
        //   void raw
        //   console.info(resp, raw)
        // })
        .catch(() => [])

      const subsp = km.register(ev => ev.identifier === id)
        .subscribe({
          next: (ev) => {
            assert(ev.identifier === id)

            assert(ev.kUid)
            assert(ev.queryUid)
            // trxId should empty, but keep value of the latest transaction
            // https://github.com/knex/knex/issues/4460
            // assert(typeof ev.trxId === 'undefined')
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

              const ret = ev.respRaw ? ev.respRaw.response.rows : null
              assert(ret && Array.isArray(ret))
              assert(ret && ret.length === 1)

              subsp.unsubscribe()
              done()
            }
          },
          error: done,
        })
      assert(typeof subsp.unsubscribe === 'function')
    })

    it('subscription ex with id', (done) => {
      const id = Symbol('subscription')
      km.refTables.ref_tb_user(id)
        .select('*faaaaa')
        .where('uid', 1)
        .catch(() => [])

      let queryUid = ''
      const subsp = km.register(ev => ev.identifier === id)
        .subscribe({
          next: (ev) => {
            assert(ev.type === 'queryError' || ev.type === 'query')

            if (ev.type === 'query') {
              assert(ev.queryUid.length)
              assert(queryUid === '')
              queryUid = ev.queryUid
            }
            else if (ev.type === 'queryError') {
              assert(ev.queryUid && ev.queryUid === queryUid)

              subsp.unsubscribe()
              done()
            }
          },
          error: done,
        })
      assert(typeof subsp.unsubscribe === 'function')
    })

    it('subscription w/o id', (done) => {
      km.refTables.ref_tb_user()
        .select('*')
        .where('uid', 1)
        .catch(() => [])

      let queryUid = ''
      const subsp = km.register()
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
              const ret = ev.respRaw ? ev.respRaw.response.rows : null

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

    it('register with id', (done) => {
      const id = Symbol('subscription')
      km.refTables.ref_tb_user(id)
        .select('*')
        .where('uid', 1)
        .catch(() => [])

      const subsp = km.register(
        (ev, id2) => ev.identifier === id && id2 === id,
        id,
      )
        .subscribe({
          next: (ev) => {
            assert(ev.kUid)
            assert(ev.queryUid)
            // trxId should empty, but keep value of the latest transaction
            // https://github.com/knex/knex/issues/4460
            // assert(typeof ev.trxId === 'undefined')

            assert(ev.method === 'select')

            if (ev.type === 'query') {
              assert(! ev.command)
            }
            else if (ev.type === 'queryResponse') {
              assert(ev.command === 'SELECT')
              const ret = ev.respRaw ? ev.respRaw.response.rows : null
              assert(ret && Array.isArray(ret))
              assert(ret && ret.length === 1)

              subsp.unsubscribe()
              done()
            }
          },
          error: done,
        })
      assert(typeof subsp.unsubscribe === 'function')
    })

    it('register w/o id', (done) => {
      const id = Symbol('subscription')
      km.refTables.ref_tb_user(id)
        .select('*')
        .where('uid', 1)
        .catch(() => [])

      const subsp = km.register(
        (ev, id2) => ev.identifier === id && ! id2 && id2 !== id,
      )
        .subscribe({
          next: (ev) => {
            if (ev.type === 'queryResponse') {
              const ret = ev.respRaw ? ev.respRaw.response.rows : null
              assert(ret && Array.isArray(ret))
              assert(ret && ret.length === 1)
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

