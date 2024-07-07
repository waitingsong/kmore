/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'
import type { RecordCamelKeys } from '@waiting/shared-types'

import { KmoreFactory } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })
  type Db = typeof km.DbModel
  type UserDo = Db['tb_user']
  type UserExtDo = Db['tb_user_ext']
  type UserDTO = RecordCamelKeys<UserDo>
  type UserExtDTO = RecordCamelKeys<UserExtDo>

  const validateUserRows = (rows: Partial<UserDTO>[]): void => {
    assert(Array.isArray(rows) && rows.length === 1)

    rows.forEach((row) => {
      assert(row?.uid)

      switch (row.uid) {
        case 1:
          assert(row.name === 'user1', JSON.stringify(row))
          assert(row.realName === 'rn1', JSON.stringify(row))
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
    it('tb_user join tb_user_ext: select later (prefer)', async () => {
      const { camelTables } = km
      const { tables, scoped } = km.dict

      await camelTables.ref_tb_user()
        .innerJoin<UserExtDTO>(
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

    it('tb_user join tb_user_ext: select first', async () => {
      const { camelTables } = km
      const { tables, scoped } = km.dict

      await camelTables.ref_tb_user()
        .select(scoped.tb_user.uid, scoped.tb_user.name, 'realName')
        .innerJoin<UserExtDTO>(
          tables.tb_user_ext,
          scoped.tb_user.uid,
          scoped.tb_user_ext.uid,
        )
        .where(scoped.tb_user.uid, 1)
        .then((rows) => {
          validateUserRows(rows as Partial<UserDTO>[])
          const [row] = rows
          assert(row?.uid)
          assert(row?.name)
          assert(row && typeof row.age === 'undefined')
          return rows
        })
    })
  })

})


