/* eslint-disable @typescript-eslint/indent */
import { basename } from '@waiting/shared-core'
import { TableModelFromAlias } from 'kmore-types'
import * as assert from 'power-assert'

import { kmore, Kmore } from '../src/index'

import { KDD2 as KDD } from './.kmore'
import { config } from './test.config'
import { User, Db, UserDetail } from './test.model'


type UserAlias = TableModelFromAlias<User, KDD['aliasColumns']['tb_user']>
type UserDetailAlias = TableModelFromAlias<UserDetail, KDD['aliasColumns']['tb_user_detail']>


const filename = basename(__filename)

describe(filename, () => {
  let km: Kmore<Db, KDD>

  before(() => {
    km = kmore<Db, KDD>({ config })
    assert(km.tables && Object.keys(km.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should inner join table works', () => {
    it('tb_user join tb_user_detail', async () => {
      const {
        rb,
        tables: t,
        scopedColumns: sc,
        aliasColumns: ac,
      } = km

      interface RowType {
        name: User['name']
        tbUserDetailUid: UserDetailAlias['tbUserDetailUid']
      }

      const cols = [ac.tb_user_detail.uid]

      const ret: RowType = await rb.tb_user()
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
    })

    it('self partial fields', async () => {
      const {
        rb,
        tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = km

      interface RowType {
        name: User['name']
        tbUserDetailUid: UserDetailAlias['tbUserDetailUid']
        tbUserUid: UserAlias['tbUserUid']
      }

      const cols = [
        ac.tb_user.uid,
        ac.tb_user_detail.uid,
      ]

      const ret: RowType = await rb.tb_user()
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
    })

    it('partial fields custom', async () => {
      const {
        rb,
        tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = km

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

    it('partial fields custom', async () => {
      const {
        rb,
        tables: t,
        scopedColumns: sc,
        aliasColumns: ac,
      } = km

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

