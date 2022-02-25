import assert from 'assert/strict'
import { relative } from 'path'

import { kmoreFactory, Kmore } from '../src/index'

import { validateUserExtRows } from './helper'
import { config, dbDict } from './test.config'
import { Db } from './test.model'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {
  let km: Kmore<Db>

  before(() => {
    km = kmoreFactory({ config, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should read table with tables param in array works', () => {

    it('Should constraint violation works', async () => {
      const { refTables } = km
      const { ref_tb_user_ext } = km.refTables

      // insert
      await ref_tb_user_ext()
        .insert([ { uid: 999, age: 10, address: 'address1' } ])
        .then((rows) => {
          assert(false, 'Should throw error, but NOT')
          return rows
        })
        .catch((err: Error) => {
          assert(true, err.message)
        })

      // validate insert result
      const countRes = await refTables.ref_tb_user_ext().count()
      assert(
        countRes && countRes[0] && countRes[0].count === '2',
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

