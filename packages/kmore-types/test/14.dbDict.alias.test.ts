import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'
import type { Equals } from '@waiting/shared-types'

import type { DbDict } from '../src/index.js'

import type { Db2, Db } from './test3.model.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should DbDict works', () => {
    type K1 = DbDict<Db>
    type K2 = DbDict<Db2> // with extra Db2.tb_user.pwd
    const foo = { } as K1
    const foo2 = { } as K2

    it('normal', () => {
      type F1 = K1['alias']['tb_user']['uid']['tbUserUid'] // 'tb_user.uid'
      const t11: Equals<F1, 'tb_user.uid'> = true
      const t12: Equals<F1, 'tb_user.name'> = false
      const t13: Equals<F1, 'uid'> = false
      const t14: Equals<F1, string> = false

      type F2 = typeof foo.alias.tb_user.uid.tbUserUid
      const t21: Equals<F2, 'tb_user.uid'> = true
      const t22: Equals<F2, 'tb_user.name'> = false
      const t23: Equals<F2, 'uid'> = false
      const t24: Equals<F2, string> = false
    })
    it('extra field', () => {
      type F3 = K2['alias']['tb_user']['pwd']['tbUserPwd']
      const t31: Equals<F3, 'tb_user.pwd'> = true
      const t32: Equals<F3, 'pwd'> = false
      const t33: Equals<F3, string> = false

      type F4 = typeof foo2.alias.tb_user.pwd.tbUserPwd
      const t41: Equals<F4, 'tb_user.pwd'> = true
      const t42: Equals<F4, 'pwd'> = false
      const t43: Equals<F4, string> = false
    })
  })

})

