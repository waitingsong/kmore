import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { CaseType, KmoreFactory } from '../src/index.js'

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

  describe('Should read table with tables param in object work', () => {
    it('tb_user', async () => {
      const tbUser = km.refTables.ref_tb_user()
      const ret = await tbUser.select('*')

      assert(ret && Array.isArray(ret))
      assert(ret.length === 3)
    })

    it('where', async () => {
      const tbUser = km.refTables.ref_tb_user()
      const ret = await tbUser.select('*')
        .where('uid', 1)
      assert(ret && Array.isArray(ret))
      assert(ret.length === 1)
    })

    it('case select', async () => {
      const tbUser = km.refTables.ref_tb_user()
      const ret = await tbUser.select('real_name')
        .where('uid', 1)
        .first()

      assert(ret)
      assert(ret.real_name === 'rn1')
    })

    it('case where', async () => {
      const tbUser = km.refTables.ref_tb_user()
      const ret = await tbUser.select('real_name')
        .where('uid', 1)
        .where('real_name', Math.random().toString())
        .first()
        .then((row) => {
          return row
        })
        .catch((ex) => {
          console.error(ex)
          assert(false)
        })

      assert(! ret, JSON.stringify(ret))
    })
  })

})

