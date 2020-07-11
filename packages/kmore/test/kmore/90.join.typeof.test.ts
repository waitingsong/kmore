/* eslint-disable @typescript-eslint/indent */
import { basename } from '@waiting/shared-core'
import { EqualsExt, FormatIntersect } from '@waiting/shared-types'
import * as assert from 'power-assert'

import { kmInst2 as kmInst } from './config'


type Db = typeof kmInst.DbModel
type DbModelAlias = typeof kmInst.DbModelAlias

type User = Db['tb_user']
type UserDetail = Db['tb_user_detail']
type UserAlias = DbModelAlias['tb_user']
type UserDetailAlias = DbModelAlias['tb_user_detail']


const filename = basename(__filename)

describe(filename, () => {
  before(() => {
    assert(kmInst.tables && Object.keys(kmInst.tables).length > 0)
  })

  describe('Should inner join table works', () => {
    it('tb_user join tb_user_detail', async () => {
      const {
        rb,
        tables: t,
        scopedColumns: sc,
        aliasColumns: ac,
      } = kmInst

      const cols = [ac.tb_user_detail.uid]

      const ret = await rb.tb_user()
        .select('name')
        .innerJoin<UserDetailAlias>(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .columns(cols)
        .then((rows) => {
          const [row] = rows
          return row
        })
      assert(Object.keys(ret).length === 2)
      assert(typeof ret.name === 'string')
      assert(typeof ret.tbUserDetailUid === 'number')

      interface RowType {
        name: User['name']
        tbUserDetailUid: UserDetailAlias['tbUserDetailUid']
      }
      type R1 = typeof ret
      type R2 = FormatIntersect<R1>
      const tt: EqualsExt<RowType, R1> = true
      const tt2: EqualsExt<RowType, R2> = true
      assert(tt)
    })

    it('self partial fields', async () => {
      const {
        rb,
        tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = kmInst

      const cols = [
        ac.tb_user.uid,
        ac.tb_user_detail.uid,
      ]

      const ret = await rb.tb_user()
        .select('name')
        .innerJoin<UserDetailAlias & UserAlias>(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .columns(cols)
        .then(rows => rows[0])

      assert(Object.keys(ret).length === 3)
      assert(typeof ret.name === 'string')
      assert(typeof ret.tbUserDetailUid === 'number')
      assert(typeof ret.tbUserUid === 'number')

      interface RowType {
        name: User['name']
        tbUserDetailUid: UserDetailAlias['tbUserDetailUid']
        tbUserUid: UserAlias['tbUserUid']
      }
      type R1 = typeof ret
      type R2 = FormatIntersect<R1>
      const tt: EqualsExt<RowType, R1> = true
      const tt2: EqualsExt<RowType, R2> = true
      assert(tt)
    })

    it('partial fields custom', async () => {
      const {
        rb,
        tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = kmInst

      const cols = [
        ac.tb_user_detail.uid,
        {
          foo: ac.tb_user_detail.uid.tbUserDetailUid,
          uid: ac.tb_user.uid.tbUserUid,
        },
      ]

      const ret = await rb.tb_user()
        .innerJoin<UserDetailAlias & UserAlias>(
          t.tb_user_detail,
          // sc.tb_user.uid,
          // sc.tb_user_detail.uid,
          ac.tb_user.uid.tbUserUid, // 'tb_user.uid'
          ac.tb_user_detail.uid.tbUserDetailUid, // 'tb_user_detail.uid'
        )
        .select('name')
        .columns(cols)
        .then(rows => rows[0])

      assert(Object.keys(ret).length === 4)
      assert(typeof ret.name === 'string')
      assert(typeof ret.tbUserDetailUid === 'number')
      assert(typeof ret.foo === 'number')
      assert(ret.foo === ret.tbUserDetailUid)
      assert(typeof ret.uid === 'number')
      assert(ret.uid === ret.tbUserDetailUid)

      const ret2: FormatIntersect<typeof ret> = ret
      return ret2
    })

    it('partial fields custom', async () => {
      const {
        rb,
        tables: t,
        scopedColumns: sc,
        aliasColumns: ac,
      } = kmInst

      const cols = [
        ac.tb_user_detail.uid,
        {
          foo: ac.tb_user_detail.uid.tbUserDetailUid,
          uid: ac.tb_user.uid.tbUserUid,
        },
      ]

      const ret = await rb.tb_user()
        .innerJoin<UserDetailAlias & UserAlias>(
          t.tb_user_detail,
          // sc.tb_user.uid,
          // sc.tb_user_detail.uid,
          ac.tb_user.uid.tbUserUid,
          ac.tb_user_detail.uid.tbUserDetailUid,
        )
        .select('name')
        .columns(cols)
        .then(rows => rows[0])

      assert(Object.keys(ret).length === 4)
      assert(typeof ret.name === 'string')
      assert(typeof ret.tbUserDetailUid === 'number')
      assert(typeof ret.foo === 'number')
      assert(ret.foo === ret.tbUserDetailUid)
      assert(typeof ret.uid === 'number')
      assert(ret.uid === ret.tbUserDetailUid)
    })
  })

})

