import assert from 'node:assert'

import { fileShortPath, sleep } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory } from '../src/index.js'

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

  describe('Should auto rollback work on error', () => {
    it('reject in .then()', async () => {
      const errorMsg = 'debug test error'

      try {
        await km.camelTables.tb_user()
          .select('uid')
          .where('uid', 1)
          .then(() => {
            const res = Promise.reject(errorMsg)
            return res
          })
      }
      catch (ex) {
        assert(ex instanceof Error, `ex type: ${typeof ex}`)
        assert(ex.message === errorMsg, ex.message)
        return
      }
      assert(false, 'Should throw error')
    })

    it('wrong sql column with tailing then()', async () => {
      try {
        await km.camelTables.tb_user()
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
        await km.camelTables.tb_user()
          .select('uid')
          .where('fake', 1)
      }
      catch (ex) {
        assert(ex instanceof Error)
        return
      }

      assert(false, 'Should error be catch, but not')
    })
  })

})

