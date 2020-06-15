import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

import { validateUserRows } from './helper'
import { config } from './test.config'
import { User, TbListModel } from './test.model'


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

  describe('Should read table with tables param in object works', () => {
    it('tb_user', async () => {
      const { rb } = db
      const { tb_user } = db.rb

      // validate insert result
      const countRes = await db.rb.tb_user().count()
      assert(
        countRes && countRes[0] && countRes[0].count === '2',
        'Should count be "2"',
      )

      const countRes2 = await rb.tb_user().count()
      assert(
        countRes2 && countRes2[0] && countRes2[0].count === '2',
        'Should count be "2"',
      )

      const countRes3 = await tb_user().count()
      assert(
        countRes3 && countRes3[0] && countRes3[0].count === '2',
        'Should count be "2"',
      )

      await tb_user().select('*')
        .then((rows) => {
          validateUserRows(rows)
          return rows
        })
        .catch((err: Error) => {
          assert(false, err.message)
        })

      return
    })
  })

})

