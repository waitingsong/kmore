import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'
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

  describe('Should work', () => {
    it('auto none', async () => {
      const trx = await km.transaction()
      assert(trx)
      const tbUser = km.camelTables.ref_tb_user()
      const { kmoreQueryId } = tbUser
      const pm = tbUser
        .transacting(trx)
        .forUpdate()
        .select('*')
        .where('uid', 1)

      const { kmoreTrxId } = trx
      const qidMap = km.trxIdQueryMap.get(kmoreTrxId)
      assert(qidMap && qidMap.size > 0)
      assert(qidMap.has(kmoreQueryId))

      await pm
      await trx.rollback()
      const qidMap2 = km.trxIdQueryMap.get(kmoreTrxId)
      assert(! qidMap2)
    })


  })

})

