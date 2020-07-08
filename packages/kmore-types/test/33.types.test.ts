import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { Tables, TableModelFromAlias } from '../src/index'

import { Db } from './test.model'


const filename = basename(__filename)

interface User {
  uid: number
  name: string
}
const tb_user = {
  uid: {
    tbUserUid: 'tb_user.uid',
  },
  name: {
    tbUserName: 'tb_user.name',
  },
} as const

describe(filename, () => {

  describe('Should type ModelFromAliasConst works', () => {
    it('with noraml value', () => {
      type JUser = typeof tb_user
      type UserAlias = TableModelFromAlias<User, typeof tb_user>
      const user: UserAlias = {
        tbUserUid: 1,
        tbUserName: 'foo',
        'tb_user.uid': 1,
        'tb_user.name': 'bar',
      }
      assert(user.tbUserUid === 1)
      assert(user.tbUserName === 'foo')
    })
  })

  describe('Should type Tables works', () => {
    it('with noraml value', () => {
      const tbs: Tables<Db> = {
        tb_user: 'tb_user',
        tb_user_detail: 'tb_user_detail',
      }
      assert(tbs.tb_user === 'tb_user')
      assert(tbs.tb_user_detail === 'tb_user_detail')

      const tbs2: Tables<Db> = {
        tb_user: 'user',
        tb_user_detail: 'userDetail',
      }
      assert(tbs2.tb_user === 'user')
      assert(tbs2.tb_user_detail === 'userDetail')
    })
    it('with invalid value', () => {
      // @ts-expect-error
      const tbs: Tables<Db> = {
        tbUser: 'tb_user',
        tbUserDetail: 'tb_user_detail',
      }
      assert(tbs.tbUser === 'tb_user')
      assert(tbs.tbUserDetail === 'tb_user_detail')
    })
  })

})

