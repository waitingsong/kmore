import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

import { validateUserDetailRows } from './helper'
import { config } from './test.config'
import { TbListModel, UserDetail } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let db: DbModel<TbListModel>

  before(() => {
    db = kmore<TbListModel>({ config })
    assert(db.tables && Object.keys(db.tables).length > 0)
  })

  after(async () => {
    await db.dbh.destroy() // !
  })

  describe('Should read table with tables param in array works', () => {

    it('Should constraint violation works', async () => {
      const { rb } = db
      const { tb_user_detail } = db.rb

      // insert
      await tb_user_detail()
        .insert([ { uid: 999, age: 10, address: 'address1' } ])
        .then((rows) => {
          assert(false, 'Should throw error, but NOT')
          return rows
        })
        .catch((err: Error) => {
          assert(true, err.message)
        })

      // validate insert result
      const countRes = await rb.tb_user_detail().count()
      assert(
        countRes && countRes[0] && countRes[0].count === '2',
        'Should count be "2"',
      )

      await db.rb.tb_user_detail().select('*')
        .then((rows) => {
          validateUserDetailRows(rows)
          return rows
        })
        .catch((err: Error) => {
          assert(false, err.message)
        })

      return
    })
  })

})

