import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import type { Kmore } from '../src/index.js'
import { KmoreFactory } from '../src/index.js'

import { validateUserExtRows } from './helper.js'
import { config, dbDict } from './test.config.js'
import type { Db } from './test.model.js'


describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>

  before(() => {
    km = KmoreFactory({ config, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should read table with tables param in array work', () => {

    it('Should constraint violation work', async () => {
      const { refTables } = km
      const { ref_tb_user_ext } = km.refTables

      // insert
      await ref_tb_user_ext()
        .insert([{ uid: 999, age: 10, address: 'address1' }])
        .then((rows) => {
          void rows
          assert(false, 'Should throw error, but NOT')
        })
        .catch((err: Error) => {
          assert(true, err.message)
        })

      // validate insert result
      const countRes = await refTables.ref_tb_user_ext().count()
      assert(
        countRes?.[0] && countRes[0]['count'] === '2',
        'Should count be "2"',
      )

      await km.refTables.ref_tb_user_ext().select('*')
        .then((rows) => {
          validateUserExtRows(rows)
          return rows
        })
        .catch((err: Error) => {
          assert(false, err.message)
        })

      return
    })
  })

})

