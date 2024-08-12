import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory } from '##/index.js'
import { config } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'


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

  describe('Should work', () => {
    it('commit', async () => {
      const trx = await km.transaction()
      assert(trx)
      const { kmoreTrxId } = trx
      assert(typeof kmoreTrxId === 'symbol')
      assert(km.getTrxByTrxId(kmoreTrxId))

      await trx.commit()
      assert(! km.getTrxByTrxId(kmoreTrxId))
    })

    it('rollback', async () => {
      const trx = await km.transaction()
      assert(trx)
      const { kmoreTrxId } = trx
      assert(typeof kmoreTrxId === 'symbol')
      assert(km.getTrxByTrxId(kmoreTrxId))

      await trx.rollback()
      assert(! km.getTrxByTrxId(kmoreTrxId))
    })

  })

})

