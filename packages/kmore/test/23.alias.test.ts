/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { basename } from '@waiting/shared-core'
import {
  ScopedColumns,
  TTables,
} from 'kmore-types'
import * as assert from 'power-assert'

import {
  kmore,
  DbModel,
  TableAliasCols,
} from '../src/index'

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


  describe('Should db.aliasColumns.tb_user works', () => {
    const keys = ['uid', 'name', 'ctime']
    const aliasKeys = ['tbUserUid', 'tbUserName', 'tbUserCtime']

    it('all fields with *', () => {
      const { aliasColumns: ac } = db
      const ps = ac.tb_user.genFieldsAlias(['*']) as Record<string, string>
      // const ps = {
      //   tbUserUid: 'tb_user.uid',
      //   tbUserName: 'tb_user.name',
      //   tbUserCtime: 'tb_user.ctime',
      // }
      aliasKeys.forEach((key) => {
        assert(typeof ps[key] === 'string' && ps[key])
      })
    })
    it('all fields with *, colName w/o converted', () => {
      const { aliasColumns: ac } = db
      const ps = ac.tb_user.genFieldsAlias(['*'], true)
      // const ps = {
      //   uid: 'tb_user.uid',
      //   name: 'tb_user.name',
      //   ctime: 'tb_user.ctime',
      // }
      keys.forEach((key) => {
        assert(typeof ps[key] === 'string' && ps[key])
      })
    })

    it('partial fields', () => {
      const { aliasColumns: ac } = db
      for (let i = 0; i < keys.length; i += 1) {
        const srcKey = keys[i] as any
        const dstKey = aliasKeys[i]
        const ps = ac.tb_user.genFieldsAlias([srcKey])

        aliasKeys.forEach((key) => {
          if (key === dstKey) {
            assert(typeof ps[key] === 'string' && ps[key])
          }
          else {
            assert(typeof ps[key] === 'undefined')
          }
        })
      }
    })
    it('partial fields, colName w/o converted', () => {
      const { aliasColumns: ac } = db
      keys.forEach((srcKey: any) => {
        const ps = ac.tb_user.genFieldsAlias([srcKey], true)
        keys.forEach((key) => {
          if (key === srcKey) {
            assert(typeof ps[key] === 'string' && ps[key])
          }
          else {
            assert(typeof ps[key] === 'undefined')
          }
        })
      })
    })
  })

  describe('Should db.aliasColumns.tb_user_detail works', () => {
    const keys = ['uid', 'age', 'address']
    const aliasKeys = ['tbUserDetailUid', 'tbUserDetailAge', 'tbUserDetailAddress']

    it('all fields with *', () => {
      const { aliasColumns: ac } = db
      const ps = ac.tb_user_detail.genFieldsAlias(['*'])
      aliasKeys.forEach((key) => {
        assert(typeof ps[key] === 'string' && ps[key])
      })
    })
    it('all fields with *, colName w/o converted', () => {
      const { aliasColumns: ac } = db
      const ps = ac.tb_user_detail.genFieldsAlias(['*'], true)
      keys.forEach((key) => {
        assert(typeof ps[key] === 'string' && ps[key])
      })
    })

    it('all fields with explicit fld name', () => {
      const { aliasColumns: ac } = db
      const ps = ac.tb_user_detail.genFieldsAlias(['uid', 'age', 'address'])
      aliasKeys.forEach((key) => {
        assert(typeof ps[key] === 'string' && ps[key])
      })
    })
    it('all fields with explicit fld name, colName w/o converted', () => {
      const { aliasColumns: ac } = db
      const ps = ac.tb_user_detail.genFieldsAlias(['uid', 'age', 'address'], true)
      keys.forEach((key) => {
        assert(typeof ps[key] === 'string' && ps[key])
      })
    })

    it('all fields with both * and explicit fld name', () => {
      const { aliasColumns: ac } = db
      const ps = ac.tb_user_detail.genFieldsAlias(['uid', 'age', 'address', '*'])
      aliasKeys.forEach((key) => {
        assert(typeof ps[key] === 'string' && ps[key])
      })
    })
    it('all fields with both * and explicit fld name, colName w/o converted', () => {
      const { aliasColumns: ac } = db
      const ps = ac.tb_user_detail.genFieldsAlias(['uid', 'age', 'address', '*'], true)
      keys.forEach((key) => {
        assert(typeof ps[key] === 'string' && ps[key])
      })
    })

    it('partial fields', () => {
      const { aliasColumns: ac } = db
      for (let i = 0; i < keys.length; i += 1) {
        const srcKey = keys[i] as any
        const dstKey = aliasKeys[i]
        const ps = ac.tb_user_detail.genFieldsAlias([srcKey])

        aliasKeys.forEach((key) => {
          if (key === dstKey) {
            assert(typeof ps[key] === 'string' && ps[key])
          }
          else {
            assert(typeof ps[key] === 'undefined')
          }
        })
      }
    })
    it('partial fields, colName w/o converted', () => {
      const { aliasColumns: ac } = db
      keys.forEach((srcKey: any) => {
        const ps = ac.tb_user_detail.genFieldsAlias([srcKey], true)
        keys.forEach((key) => {
          if (key === srcKey) {
            assert(typeof ps[key] === 'string' && ps[key])
          }
          else {
            assert(typeof ps[key] === 'undefined')
          }
        })
      })
    })
  })

  describe('Should inner join table works', () => {
    it('tb_user join tb_user_detail via aliasColumns', async () => {
      const {
        rb, tables: t,
        aliasColumns: ac,
        columns: co,
        scopedColumns: sc,
      } = db

      // const alias = genAliasColumns(sc)
      // const ps = genKnexColumnsParam(
      //   ac.tb_user_detail,
      //   ['uid', 'address'],
      // )
      // const ps2 = genKnexColumnsParam(
      //   ac.tb_user_detail,
      //   ['uid', 'address'],
      //   true,
      // )

      const ps1 = ac.tb_user.genFieldsAlias(['*'], true)
      const ps2 = ac.tb_user_detail.genFieldsAlias(['*'])
      const ps = {
        ...ps1,
        ...ps2,
      }

      await rb.tb_user()
        .column([ps1, ps2])
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
          valiateRowHasColumnNames(row, Object.keys(ps))
          assert(row && row.uid === 1)
          assert(row && typeof row.name === 'string' && row.name)
          assert(row && row.uid && row.uid === row.tbUserDetailUid)

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return rows
        })
      // const query = obj.toQuery()
      // console.info('query:', query)
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

