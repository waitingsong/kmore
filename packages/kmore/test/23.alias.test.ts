/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { basename } from '@waiting/shared-core'
import { TableModelFromAlias, JoinTable, JoinTableUnique } from 'kmore-types'
import * as Knex from 'knex'
import * as assert from 'power-assert'


import {
  kmore,
  Kmore,
  TableAliasCols,
  DbDict,
} from '../src/index'

import { config } from './test.config'
import { User, Db, UserDetail } from './test.model'


const tables = {
  tb_user: 'tb_user',
  tb_user_detail: 'tb_user_detail',
} as const

const columns = {
  tb_user: {
    uid: 'uid',
    name: 'name',
    ctime: 'ctime',
  },
  tb_user_detail: {
    uid: 'uid',
    age: 'age',
    address: 'address',
  },
} as const

const scopedColumns = {
  tb_user: {
    uid: 'tb_user.uid',
    name: 'tb_user.name',
    ctime: 'tb_user.ctime',
  },
  tb_user_detail: {
    uid: 'tb_user_detail.uid',
    age: 'tb_user_detail.age',
    address: 'tb_user_detail.address',
  },
} as const

const aliasCols = {
  tb_user: {
    uid: {
      tbUserUid: 'tb_user.uid',
    },
    name: {
      tbUserName: 'tb_user.name',
    },
    ctime: {
      tbUserCtime: 'tb_user.ctime',
    },
  },
  tb_user_detail: {
    uid: {
      tbUserDetailUid: 'tb_user_detail.uid',
    },
    age: {
      tbUserDetailAge: 'tb_user_detail.age',
    },
    address: {
      tbUserDetailAddress: 'tb_user_detail.address',
    },
  },
} as const
type AliasCols = typeof aliasCols

export const dbDict: DbDict<Db> = {
  tables,
  columns,
  aliasColumns: aliasCols,
  scopedColumns,
}

interface AliasCols2 {
  tb_user: {
    uid: {
      tbUserUid: 'tb_user.uid',
    },
    name: {
      tbUserName: 'tb_user.name',
    },
    ctime: {
      tbUserCtime: 'tb_user.ctime',
    },
  }
  tb_user_detail: {
    uid: {
      tbUserDetailUid: 'tb_user_detail.uid',
    },
    age: {
      tbUserDetailAge: 'tb_user_detail.age',
    },
    address: {
      tbUserDetailAddress: 'tb_user_detail.address',
    },
  }
}


const filename = basename(__filename)

describe(filename, () => {
  let km: Kmore<Db>

  before(() => {
    km = kmore<Db>({ config })
    assert(km.tables && Object.keys(km.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should km.aliasColumns.tb_user works', () => {
    const acUser = aliasCols.tb_user
    const keys: (keyof AliasCols['tb_user'])[] = ['uid', 'name', 'ctime']
    const aliasKeys = ['tbUserUid', 'tbUserName', 'tbUserCtime']

    type UserAlias = TableModelFromAlias<User, AliasCols['tb_user']>
    type UserDetailAlias = TableModelFromAlias<UserDetail, AliasCols['tb_user_detail']>

    type UserAlias2 = TableModelFromAlias<User, AliasCols2['tb_user']>
    type UserDetailAlias2 = TableModelFromAlias<UserDetail, AliasCols2['tb_user_detail']>

    type Foo = JoinTable<User, UserDetail, 'age'>
    type Foo2 = JoinTableUnique<User, UserDetail>

    it('partial fields', async () => {
      const {
        rb,
        tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = km
      // const ps = rb.tb_user.genAlias()
      // const ps = {
      //   tbUserUid: 'tb_user.uid',
      //   tbUserName: 'tb_user.name',
      //   tbUserCtime: 'tb_user.ctime',
      // }

      const cols = [aliasCols.tb_user_detail.uid]

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
    })
    it('self partial fields', async () => {
      const {
        rb,
        tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = km

      const cols = [
        aliasCols.tb_user.uid,
        aliasCols.tb_user_detail.uid,
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
    })
    it('self partial fields 2', async () => {
      const {
        rb,
        tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = km

      const cols = [
        aliasCols.tb_user.uid,
        aliasCols.tb_user_detail.uid,
      ]

      const ret = await rb.tb_user()
        .select('name')
        .innerJoin<UserDetailAlias2 & UserAlias2>(
          t.tb_user_detail,
          sc.tb_user.uid,
          sc.tb_user_detail.uid,
        )
        .columns(cols)
        .then(rows => rows[0])

      assert(Object.keys(ret).length === 3)
      assert(ret && typeof ret.name === 'string')
      assert(ret && typeof ret.tbUserDetailUid === 'number')
      assert(ret && typeof ret.tbUserUid === 'number')
    })
    it('self partial fields 3', async () => {
      const {
        rb,
        tables: t,
        aliasColumns: ac,
        scopedColumns: sc,
      } = km

      const cols = [
        aliasCols.tb_user.uid,
        aliasCols.tb_user_detail.uid,
      ]

      const ret = await rb.tb_user()
        .select('name')
        .innerJoin<UserDetailAlias2 & UserAlias2>(
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
        aliasCols.tb_user_detail.uid,
        {
          foo: aliasCols.tb_user_detail.uid.tbUserDetailUid,
          uid: aliasCols.tb_user.uid.tbUserUid,
        },
      ]

      const ret = await rb.tb_user()
        .innerJoin<UserDetailAlias & UserAlias>(
          t.tb_user_detail,
          // sc.tb_user.uid,
          // sc.tb_user_detail.uid,
          aliasCols.tb_user.uid.tbUserUid,
          aliasCols.tb_user_detail.uid.tbUserDetailUid,
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
        aliasColumns,
        scopedColumns: sc,
      } = km

      const ac = aliasColumns as AliasCols

      const cols = [
        aliasCols.tb_user_detail.uid,
        {
          foo: aliasCols.tb_user_detail.uid.tbUserDetailUid,
          uid: aliasCols.tb_user.uid.tbUserUid,
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

