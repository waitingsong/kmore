import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { kmoreFactory } from '../src/index.js'

import { config } from './test.config.js'
import { Db } from './test.model.js'


describe(fileShortPath(import.meta.url), () => {
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
      const tbUser = km.camelTables.ref_tb_user()
      const ret = await tbUser.select('*')

      assert(ret && Array.isArray(ret))
      assert(ret.length === 3)
    })

    it('where', async () => {
      const tbUser = km.camelTables.ref_tb_user()
      const ret = await tbUser.select('*')
        .where('uid', 1)
      assert(ret && Array.isArray(ret))
      assert(ret.length === 1)
    })

  })

})

