import assert from 'node:assert/strict'

import { fileShortPath, sleep } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory } from '../src/index.js'

import { config } from './test.config.js'
import { Db } from './test.model.js'


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

  describe('Should auto rollback work on error', () => {
    it('reject in .then()', async () => {
      const errorMsg = 'debug test error'

      try {
        await km.camelTables.ref_tb_user()
          .select('uid')
          .where('uid', 1)
          .then(() => {
            return Promise.reject(errorMsg)
          })
      }
      catch (ex) {
        assert(ex instanceof Error)
        assert(ex.message === errorMsg)
        return
      }
      assert(false, 'Should throw error')
    })

    it('wrong sql column with tailing then()', async () => {
      try {
        await km.camelTables.ref_tb_user()
          .select('uid')
          .where('fake', 1)
          .then()
      }
      catch (ex) {
        assert(ex instanceof Error)
        return
      }
      assert(false, 'Should throw error')
    })

    it('wrong sql column without tailing then()', async () => {
      try {
        await km.camelTables.ref_tb_user()
          .select('uid')
          .where('fake', 1)
      }
      catch (ex) {
        assert(ex instanceof Error)
        return
      }

      assert(false, 'Should error be catched, but not')
    })
  })

})

