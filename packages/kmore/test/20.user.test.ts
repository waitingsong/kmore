import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

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

  describe('Should insert/read table with tables param in object works', () => {
    it('tb_user', async () => {
      const { rb } = db
      const { tb_user } = db.rb

      // insert
      await db.rb.tb_user()
        .insert([
          { name: 'user1', ctime: new Date() }, // ms
          { name: 'user2', ctime: 'now()' }, // μs
        ])
        .returning('*')
        .then((rows) => {
          validateUserRows(rows)
          return rows
        })
        .catch((err: Error) => {
          assert(false, err.message)
        })

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


function validateUserRows(rows: Partial<User>[]): void {
  assert(Array.isArray(rows) && rows.length > 0)

  rows.forEach((row) => {
    assert(row && row.uid)

    switch (row.uid) {
      case 1:
        assert(row.name === 'user1', JSON.stringify(row))
        break
      case 2:
        assert(row.name === 'user2', JSON.stringify(row))
        break
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
        break
    }
  })
}
