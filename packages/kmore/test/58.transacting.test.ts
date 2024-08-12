import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory, TrxControl } from '##/index.js'

import { config } from './test.config.js'
import type { Db } from './test.model.js'


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

  describe('Should transacting work', () => {
    it('common', async () => {
      const trx = await km.transaction()
      assert(trx)
      const tbUser = km.camelTables.tb_user()
      const { kmoreQueryId } = tbUser
      const ret = await tbUser
        .transacting(trx)
        .forUpdate()
        .select('*')
        .where('uid', 1)

      const { kmoreTrxId } = trx
      const qidMap = km.getQueryIdListByTrxId(kmoreTrxId)
      assert(qidMap && qidMap.size > 0)
      assert(qidMap.has(kmoreQueryId))

      await trx.commit()
      assert(ret && Array.isArray(ret))
      assert(ret.length === 1)
      const qidMap2 = km.getQueryIdListByTrxId(kmoreTrxId)
      assert(! qidMap2)
    })

    it(TrxControl.Commit, async () => {
      const trx = await km.transaction()
      assert(trx)
      const tbUser = km.camelTables.tb_user()
      const { kmoreQueryId } = tbUser
      const pm = tbUser
        .transacting(trx)
        .forUpdate()
        .select('*')
        .where('uid', 1)

      const { kmoreTrxId } = trx
      const qidMap = km.getQueryIdListByTrxId(kmoreTrxId)
      assert(qidMap && qidMap.size > 0)
      assert(qidMap.has(kmoreQueryId))

      const ret = await pm

      await trx.commit()
      assert(ret && Array.isArray(ret))
      assert(ret.length === 1)
      const qidMap2 = km.getQueryIdListByTrxId(kmoreTrxId)
      assert(! qidMap2)
    })

    it(TrxControl.Rollback, async () => {
      const trx = await km.transaction()
      assert(trx)
      const tbUser = km.camelTables.tb_user()
      const { kmoreQueryId } = tbUser
      const pm = tbUser
        .transacting(trx)
        .forUpdate()
        .select('*')
        .where('uid', 1)

      const { kmoreTrxId } = trx
      const qidMap = km.getQueryIdListByTrxId(kmoreTrxId)
      assert(qidMap && qidMap.size > 0)
      assert(qidMap.has(kmoreQueryId))

      await pm
      await trx.rollback()
      const qidMap2 = km.getQueryIdListByTrxId(kmoreTrxId)
      assert(! qidMap2)
    })


  })

})

