import { basename } from '@waiting/shared-core'
import { Equals } from '@waiting/shared-types'
import { TableModelFromAlias } from 'kmore-types'
import * as assert from 'power-assert'

import { Kmore } from '../src/index'

import { DbDict as Dict } from './kmore/.kmore'
import { User, Db, UserDetail } from './test.model'


type UserAlias = TableModelFromAlias<User, Dict['aliasColumns']['tb_user']>
type UserDetailAlias = TableModelFromAlias<UserDetail, Dict['aliasColumns']['tb_user_detail']>

const filename = basename(__filename)

describe(filename, () => {

  describe('Should kmore.DbModel type works', () => {
    it('normal', async () => {
      let km: Kmore<Db, Dict>

      type DbRef = typeof km.DbModel
      const t11: Equals<Db, DbRef> = true
      const t12: Equals<Db['tb_user'], DbRef['tb_user']> = true
      const t13: Equals<Db['tb_user_detail'], DbRef['tb_user_detail']> = true
      const t14: Equals<Db['tb_user']['uid'], DbRef['tb_user']['uid']> = true

      type UserAlias2 = TableModelFromAlias<DbRef['tb_user'], Dict['aliasColumns']['tb_user']>
      const t21: Equals<UserAlias, UserAlias2> = true
      const t22: Equals<UserAlias['tbUserUid'], UserAlias2['tbUserUid']> = true
      const t23: Equals<UserAlias['tbUserUid'], UserAlias2['tb_user.uid']> = true

      type UserDetailAlias2 = TableModelFromAlias<DbRef['tb_user_detail'], Dict['aliasColumns']['tb_user_detail']>
      const t31: Equals<UserDetailAlias, UserDetailAlias2> = true
      const t32: Equals<UserDetailAlias['tbUserDetailUid'], UserDetailAlias2['tbUserDetailUid']> = true
      const t33: Equals<UserDetailAlias['tbUserDetailUid'], UserDetailAlias2['tb_user_detail.uid']> = true
    })
    it('w/o 2nd generics param', async () => {
      let km: Kmore<Db>

      type DbRef = typeof km.DbModel
      const t11: Equals<Db, DbRef> = true
      const t12: Equals<Db['tb_user'], DbRef['tb_user']> = true
      const t13: Equals<Db['tb_user_detail'], DbRef['tb_user_detail']> = true
      const t14: Equals<Db['tb_user']['uid'], DbRef['tb_user']['uid']> = true

      type UserAlias2 = TableModelFromAlias<DbRef['tb_user'], Dict['aliasColumns']['tb_user']>
      const t21: Equals<UserAlias, UserAlias2> = true
      const t22: Equals<UserAlias['tbUserUid'], UserAlias2['tbUserUid']> = true

      type UserDetailAlias2 = TableModelFromAlias<DbRef['tb_user_detail'], Dict['aliasColumns']['tb_user_detail']>
      const t31: Equals<UserDetailAlias, UserDetailAlias2> = true
      const t32: Equals<UserDetailAlias['tbUserDetailUid'], UserDetailAlias2['tbUserDetailUid']> = true
    })
  })

})

