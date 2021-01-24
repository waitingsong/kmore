/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { basename } from '@waiting/shared-core'

import { kmInst3 as kmInst } from './config'

// eslint-disable-next-line import/order
import assert = require('power-assert')


type Db = typeof kmInst.DbModel

type User = Db['tb_user']
type UserDetail = Db['tb_user_detail']


const filename = basename(__filename)

describe(filename, () => {
  before(() => {
    assert(kmInst.tables && Object.keys(kmInst.tables).length > 0)
  })

  describe('Should inner join table works', () => {
    it('tb_user join tb_user_detail via scopedColumns', async () => {
      const { tables: t, rb, scopedColumns: sc } = kmInst

      await rb.tb_user()
        .innerJoin<UserDetail>(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .select('*')
        .where(sc.tb_user.uid, 1)
        .then((rows) => {
          validateUserRows(rows)
          const [row] = rows
          assert(row && row.uid)
          assert(row && row.name)
          assert(row && row.age)
          return rows
        })
    })

    it.skip('tb_user join tb_user_detail via scopedColumns and KeyExcludeOptional', async () => {
      const { tables: t, rb, scopedColumns: sc } = kmInst

      await rb.tb_user()
        .select(sc.tb_user.uid, sc.tb_user.name)
        .innerJoin(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .where(sc.tb_user.uid, 1)
        .then((rows) => {
          validateUserRows(rows)
          const [row] = rows
          assert(row && row.uid)
          assert(row && row.name)
          assert(row && typeof row.age === 'undefined')
          return rows
        })
    })

    it.skip('tb_user join tb_user_detail via scopedColumns and KeyExcludeOptional/key', async () => {
      const { tables: t, rb, scopedColumns: sc } = kmInst

      await rb.tb_user()
        .select()
        .innerJoin(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .where(sc.tb_user.uid, 1)
        .then((rows) => {
          validateUserRows(rows)
          const [row] = rows
          // assert(row && row.uid)
          assert(row && row.name)
          // types of row has no key `age`, but var row has key `age`
          // @ts-ignore
          assert(row && typeof row.age === 'number')
          return rows
        })
    })


    it('tb_user join tb_user_detail', async () => {
      const { tables: t, rb } = kmInst

      await rb.tb_user()
        .select(`${t.tb_user}.uid`, `${t.tb_user}.name`)
        .innerJoin(
          t.tb_user_detail,
          `${t.tb_user}.uid`,
          `${t.tb_user_detail}.uid`,
        )
        .where(`${t.tb_user}.uid`, 1)
        .then((rows) => {
          validateUserRows(rows)
          return rows
        })
    })
  })

})


function validateUserRows(rows: Partial<User>[]): void {
  assert(Array.isArray(rows) && rows.length === 1)

  rows.forEach((row) => {
    assert(row && row.uid)

    switch (row.uid) {
      case 1:
        assert(row.name === 'user1', JSON.stringify(row))
        break
      default:
        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
        break
    }
  })
}
