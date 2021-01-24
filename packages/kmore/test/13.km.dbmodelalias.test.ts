import { basename } from '@waiting/shared-core'
import {
  Equals,
  FullTableModelFromDictAlias,
} from '@waiting/shared-types'

import { Kmore } from '../src/index'

import { DbDict as Dict } from './join-table/.kmore'
import { User, Db, UserDetail } from './test.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


type UserAlias = FullTableModelFromDictAlias<User, Dict['aliasColumns']['tb_user']>
type UserDetailAlias = FullTableModelFromDictAlias<UserDetail, Dict['aliasColumns']['tb_user_detail']>

const filename = basename(__filename)

describe(filename, () => {

  describe('Should kmore.DbModelalias type works', () => {
    it('normal', async () => {
      let km: Kmore<Db, Dict>
      type DbModelAliasRef = typeof km.DbModelAlias

      type UserAlias2 = DbModelAliasRef['tb_user']
      const t11: Equals<UserAlias, UserAlias2> = true
      const t12: Equals<UserAlias['tbUserUid'], UserAlias2['tbUserUid']> = true
      const t13: Equals<UserAlias['tbUserUid'], UserAlias2['tb_user.uid']> = true

      type UserDetailAlias2 = DbModelAliasRef['tb_user_detail']
      const t21: Equals<UserDetailAlias, UserDetailAlias2> = true
      const t22: Equals<UserDetailAlias['tbUserDetailUid'], UserDetailAlias2['tbUserDetailUid']> = true
      const t23: Equals<UserDetailAlias['tbUserDetailUid'], UserDetailAlias2['tb_user_detail.uid']> = true
    })
    it('w/o 2nd generics param', async () => {
      let km: Kmore<Db>
      type DbModelAliasRef = typeof km.DbModelAlias

      type UserAlias2 = DbModelAliasRef['tb_user'] // never
      const t11: Equals<UserAlias, UserAlias2> = false
      const t12: Equals<never, UserAlias2> = true

      type UserDetailAlias2 = DbModelAliasRef['tb_user_detail']
      const t21: Equals<UserDetailAlias, UserDetailAlias2> = false
      const t22: Equals<never, UserDetailAlias2> = true
    })
  })

})

