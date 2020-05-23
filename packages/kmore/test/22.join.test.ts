/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

import { config } from './test.config'
import { User, TbListModel, UserDetail } from './test.model'


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

  describe('Should inner join table works', () => {
    it('tb_user join tb_user_detail via scopedColumns', async () => {
      const { tables: t, rb, scopedColumns: sc } = db

      await rb.tb_user<UserDetail>()
        // .select(sc.tb_user.uid, sc.tb_user.name)
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
          assert(row && row.uid)
          assert(row && row.name)
          assert(row && row.age)
          return rows
        })
    })

    it('tb_user join tb_user_detail via scopedColumns and KeyExcludeOptional', async () => {
      const { tables: t, rb, scopedColumns: sc } = db

      await rb.tb_user<UserDetail, 'age'>()
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

    it('tb_user join tb_user_detail via scopedColumns and KeyExcludeOptional/key', async () => {
      const { tables: t, rb, scopedColumns: sc } = db

      await rb.tb_user<UserDetail, 'age'>()
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
          assert(row && row.uid)
          assert(row && row.name)
          // types of row has no key `age`, but var row has key `age`
          // @ts-ignore
          assert(row && typeof row.age === 'number')
          return rows
        })
    })


    it('tb_user join tb_user_detail', async () => {
      const { tables: t, rb } = db

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
