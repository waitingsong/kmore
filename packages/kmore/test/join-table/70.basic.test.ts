import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { kmoreFactory } from '../../src/index.js'
import { config, dbDict } from '../test.config.js'


describe(fileShortPath(import.meta.url), () => {
  const km = kmoreFactory({ config, dict: dbDict })
  type Db = typeof km.DbModel
  type UserDo = Db['tb_user']
  type UserExtDo = Db['tb_user_ext']

  const validateUserRows = (rows: Partial<UserDo>[]): void => {
    assert(Array.isArray(rows) && rows.length === 1)

    rows.forEach((row) => {
      assert(row && row.uid)

      switch (row.uid) {
        case 1:
          assert(row.name === 'user1', JSON.stringify(row))
          break
        default:
          assert(false, `Should row.uid be 1 or 2, but got ${row.uid ? row.uid : 'n/a'}`)
          break
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
          assert(row && row.uid)
          assert(row && row.name)
          assert(row && row.age)
          return rows
        })
    })

    it('tb_user join tb_user_ext 2', async () => {
      const { refTables } = km
      const { tables, scoped } = km.dict

      await refTables.ref_tb_user()
        .select(scoped.tb_user.uid, scoped.tb_user.name)
        .innerJoin(
          tables.tb_user_ext,
          scoped.tb_user.uid,
          scoped.tb_user_ext.uid,
        )
        .where(scoped.tb_user.uid, 1)
        .then((rows) => {
          validateUserRows(rows as Partial<UserDo>[])
          const [row] = rows
          assert(row && row.uid)
          assert(row && row.name)
          assert(row && typeof row.age === 'undefined')
          return rows
        })
    })
  })

})


