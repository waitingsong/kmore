import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

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


  describe('Should insert/read table with tables param in array works', () => {
    it('tb_user_detail', async () => {
      const { rb } = db
      const { tb_user_detail } = db.rb

      // insert
      await tb_user_detail()
        .insert([
          { uid: 1, age: 10, address: 'address1' },
          { uid: 2, age: 10, address: 'address1' },
        ])
        .returning('*')
        .then((rows) => {
          validateUserDetailRows(rows)
          return rows
        })
        .catch((err: Error) => {
          assert(false, err.message)
        })

      const countRes = await rb.tb_user_detail().count()
      assert(
        countRes && countRes[0] && countRes[0].count === '2',
        'Should count be "2"',
      )

      // validate insert result
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


function validateUserDetailRows(rows: Partial<UserDetail>[]): void {
  assert(Array.isArray(rows) && rows.length > 0)

  rows.forEach((row) => {
    assert(row && row.uid)

    switch (row.uid) {
      case 1:
        assert(row.age === 10, JSON.stringify(row))
        break
      case 2:
        assert(row.age === 10, JSON.stringify(row))
        break
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
        break
    }
  })
}
