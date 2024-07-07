import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })
  type Db = typeof km.DbModel
  type UserDo = Db['tb_user']
  type UserExtDo = Db['tb_user_ext']
  type OrderDo = Db['tb_order']

  const validateUserRows = (rows: (UserDo & UserExtDo)[]): void => {
    assert(Array.isArray(rows) && rows.length === 1)

    rows.forEach((row) => {
      assert(row && row.uid)

      switch (row.uid) {
        case 1:
          assert(row.name === 'user1', JSON.stringify(row))
          assert(row.real_name === 'rn1', JSON.stringify(row))
          break

        default:
          assert(false, `Should row.uid be 1 or 2, but got ${row.uid ? row.uid : 'n/a'}`)
      }
    })
  }


  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should inner join table work', () => {
    it('tb_user join tb_user_ext', async () => {
      const { refTables } = km
      const { tables, scoped } = km.dict

      await refTables.ref_tb_user()
        .innerJoin<UserExtDo>(
          tables.tb_user_ext,
          scoped.tb_user.uid,
          scoped.tb_user_ext.uid,
        )
        .select('*')
        .where(scoped.tb_user.uid, 1)
        .then((rows) => {
          validateUserRows(rows)
          const [row] = rows
          assert(row)
          assert(row && row.uid)
          assert(row && row.name)
          assert(row && row.age)
          return rows
        })
    })

  })

})


