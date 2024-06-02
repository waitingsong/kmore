import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { countTbUser, deleteRow } from '#@/helper.js'

import { KmoreFactory } from '../../src/index.js'
import { config } from '../test.config.js'
import { Db } from '../test.model.js'


describe(fileShortPath(import.meta.url), () => {
  const dict = genDbDict<Db>()
  const km = KmoreFactory({ config, dict })
  const tables = km.camelTables
  const uid = 2

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    if (km.dbh?.destroy) {
      await km.dbh.destroy() // !
    }
  })

  describe('Should transaction work', () => {
    it('transaction', async () => {
      const trx = await km.transaction()
      assert(trx)
      const tbUser = km.camelTables.ref_tb_user()
      const ret = await tbUser
        .transacting(trx)
        .forUpdate()
        .select('*')
        .where('uid', 1)

      await trx.commit()
      assert(ret && Array.isArray(ret))
      assert(ret.length === 1)
    })

    it('transaction rollback', async () => {
      const trx1 = await km.transaction()
      assert(trx1)
      let tbUser = km.camelTables.ref_tb_user()

      const uidsAll = await tbUser
        .select('*')

      assert(uidsAll)
      assert(uidsAll.length === 3)

      const uid2 = 2
      const uid99 = 99
      await tbUser
        .transacting(trx1)
        .forUpdate()
        .update('uid', uid99)
        .where('uid', uid2)
        .returning('uid')
        .then((uids) => {
          assert(uids, uids.toString())
          assert(uids.length === 1, uids.toString())
          const row = uids[0] as unknown as { uid: number }
          assert(row)
          assert(row.uid === uid99)
        })
      const uidsAll2 = await tbUser
        .select('*')

      assert(uidsAll2)
      assert(uidsAll2.length === 0)
      await trx1.rollback()

      tbUser = km.camelTables.ref_tb_user()
      const uidsAll3 = await tbUser
        .select('*')
        .then()
      assert(uidsAll3)
      assert(uidsAll3)
      assert(uidsAll3.length === 3)

      tbUser = km.camelTables.ref_tb_user()
      const trx2 = await km.transaction()
      assert(trx2)
      const ret2 = await tbUser
        .transacting(trx2)
        .forUpdate()
        .select('*')
        .where('uid', 1)
      assert(ret2 && Array.isArray(ret2))
      assert(ret2.length === 1)

      const ret3 = await tbUser
        .transacting(trx2)
        .forUpdate()
        .select('*')
        .where('uid', uid2)

      assert(ret3 && Array.isArray(ret3))
      assert(ret3.length === 0)

      await trx2.rollback()
    })

    it('rollback delete', async () => {
      const trx = await km.transaction()

      const count0 = await countTbUser(km)
      assert(count0 === 3, `count0: ${count0} != 3`)

      await deleteRow(km, tables, trx, uid)

      const count1 = await countTbUser(km, trx)
      assert(count1 === 2, `before rollback count: ${count1} != 2`)

      await trx.rollback()

      const count2 = await countTbUser(km)
      assert(count2 === 3, `after rollback count: ${count2} != 3`)
    })
  })

})

