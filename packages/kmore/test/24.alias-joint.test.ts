import { basename } from '@waiting/shared-core'
import {
  TTables,
  JointTable,
} from 'kmore-types'
import * as assert from 'power-assert'

import {
  kmore,
  DbModel,
} from '../src/index'

// eslint-disable-next-line import/named
import { AC, TbListModel, User } from './config/test.config2'
import { config } from './test.config'


type JointRowFull = JointTable<User, AC.TbListModel['tb_user_detail']>
type JointRowPartial = JointTable<User, AC.TbListModel['tb_user_detail'], 'tbUserDetailAge'>
type JointRowPartialUser = JointTable<User, AC.TbListModel['tb_user_detail'], 'name' | 'tbUserDetailAge'>

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
    it('full fields', async () => {
      const {
        rb, tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = db

      const ps1 = ac.tb_user.genFieldsAlias(['*'], true)
      const ps2 = ac.tb_user_detail.genFieldsAlias(['*'])

      await rb.tb_user()
        .column<JointRowFull[]>([ps1, ps2])
        .select()
        .innerJoin(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .where(sc.tb_user.uid, 1)
        .then((rows) => {
          console.info(rows)
          validateUserRows(rows)

          const [row] = rows
          console.log(row)
          valiateRowHasColumnNames(row, Object.keys({ ...ps1, ...ps2 }))
          assert(row && row.uid === 1)
          assert(typeof row.name === 'string' && row.name)

          assert(row.uid && row.uid === row.tbUserDetailUid)
          assert(typeof row.tbUserDetailAge === 'number' && row.tbUserDetailAge)
          assert(typeof row.tbUserDetailAddress === 'string' && row.tbUserDetailAddress)

          return rows
        })
      return
    })

    it('partial tb_user and tb_user_detail, passing array', async () => {
      const {
        rb, tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = db

      const ps1 = ac.tb_user.genFieldsAlias(['uid'], true)
      const ps2 = ac.tb_user_detail.genFieldsAlias(['uid', 'address'])

      await rb.tb_user()
        .column<JointRowPartialUser[]>([ps1, ps2]) // array
        .select()
        .innerJoin(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .where(sc.tb_user.uid, 1)
        .then((rows) => {
          console.info(rows)
          // validateUserRows(rows)

          const [row] = rows
          console.log(row)
          valiateRowHasColumnNames(row, Object.keys({ ...ps1, ...ps2 }))
          assert(row && row.uid === 1)

          assert(row.uid && row.uid === row.tbUserDetailUid)
          assert(typeof row.tbUserDetailAddress === 'string' && row.tbUserDetailAddress)

          assert(typeof (row as any).name === 'undefined')
          assert(typeof (row as any).tbUserDetailAge === 'undefined')

          return rows
        })
      return
    })


    it('partial tb_user_detail, passing array', async () => {
      const {
        rb, tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = db

      const ps1 = ac.tb_user.genFieldsAlias(['*'], true)
      const ps2 = ac.tb_user_detail.genFieldsAlias(['uid', 'address'])

      await rb.tb_user()
        .column<JointRowPartial[]>([ps1, ps2]) // array
        .select()
        .innerJoin(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .where(sc.tb_user.uid, 1)
        .then((rows) => {
          console.info(rows)
          validateUserRows(rows)

          const [row] = rows
          console.log(row)
          valiateRowHasColumnNames(row, Object.keys({ ...ps1, ...ps2 }))
          assert(row && row.uid === 1)
          assert(typeof row.name === 'string' && row.name)

          assert(row.uid && row.uid === row.tbUserDetailUid)
          assert(typeof row.tbUserDetailAddress === 'string' && row.tbUserDetailAddress)

          assert(typeof (row as any).tbUserDetailAge === 'undefined')

          return rows
        })
      return
    })

    it('partial tb_user_detail, passing two parameters', async () => {
      const {
        rb, tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = db

      const ps1 = ac.tb_user.genFieldsAlias(['*'], true)
      const ps2 = ac.tb_user_detail.genFieldsAlias(['uid', 'address'])

      await rb.tb_user()
        .column<JointRowPartial[]>(ps1, ps2) // 2 parameters
        .select()
        .innerJoin(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .where(sc.tb_user.uid, 1)
        .then((rows) => {
          console.info(rows)
          validateUserRows(rows)

          const [row] = rows
          console.log(row)
          valiateRowHasColumnNames(row, Object.keys({ ...ps1, ...ps2 }))
          assert(row && row.uid === 1)
          assert(typeof row.name === 'string' && row.name)

          assert(row.uid && row.uid === row.tbUserDetailUid)
          assert(typeof row.tbUserDetailAddress === 'string' && row.tbUserDetailAddress)

          assert(typeof (row as any).tbUserDetailAge === 'undefined')

          return rows
        })
      return
    })

    it('partial tb_user_detail, passing merged parameters', async () => {
      const {
        rb, tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = db

      const ps1 = ac.tb_user.genFieldsAlias(['*'], true)
      const ps2 = ac.tb_user_detail.genFieldsAlias(['uid', 'address'])
      const ps3 = { ...ps1, ...ps2 }

      await rb.tb_user()
        .column<JointRowPartial[]>(ps3) // one mreged
        .select()
        .innerJoin(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .where(sc.tb_user.uid, 1)
        .then((rows) => {
          console.info(rows)
          validateUserRows(rows)

          const [row] = rows
          console.log(row)
          valiateRowHasColumnNames(row, Object.keys({ ...ps1, ...ps2 }))
          assert(row && row.uid === 1)
          assert(typeof row.name === 'string' && row.name)

          assert(row.uid && row.uid === row.tbUserDetailUid)
          assert(typeof row.tbUserDetailAddress === 'string' && row.tbUserDetailAddress)

          assert(typeof (row as any).tbUserDetailAge === 'undefined')

          return rows
        })
      return
    })
  })

})


function valiateRowHasColumnNames(row: any, columns: string[]): void {
  assert(typeof row === 'object' && row)
  columns.forEach((colName) => {
    assert(typeof row[colName] !== 'undefined' && row[colName])
  })
}

function validateUserRows(rows: unknown[]): void {
  assert(Array.isArray(rows) && rows.length === 1)

  rows.forEach((row) => {
    assert(row && typeof row.uid === 'number' && row.uid)

    switch (row.uid) {
      case 1:
        assert(row.name === 'user1', JSON.stringify(row))
        break
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
        break
    }
  })
}

