import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory } from '##/index.js'
import { config } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'

import { updateWithoutTrx } from './helper.js'


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
  describe('Should work', () => {
    it('auto none', async () => {
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

