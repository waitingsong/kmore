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

  describe('Should read table with tables param in object work', () => {
    it('tb_user', async () => {
      const tbUser = km.camelTables.tb_user()
      const ret = await tbUser.select('*')

      assert(ret && Array.isArray(ret))
      assert(ret.length === 3)
    })

    it('where', async () => {
      const tbUser = km.camelTables.tb_user()
      const ret = await tbUser.select('*')
        .where('uid', 1)
      assert(ret && Array.isArray(ret))
      assert(ret.length === 1)
    })

    it('case select', async () => {
      const tbUser = km.camelTables.tb_user()
      const ret = await tbUser.select('realName')
        .where('uid', 1)
        .first()

      assert(ret)
      assert(ret.realName === 'rn1')
    })

    it('case where', async () => {
      const tbUser = km.camelTables.tb_user()
      const ret = await tbUser.select('realName')
        .where('uid', 1)
        .where('realName', Math.random().toString())
        .first()

      assert(! ret)
    })
  })

})

