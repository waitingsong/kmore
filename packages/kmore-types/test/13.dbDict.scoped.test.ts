/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { basename } from '@waiting/shared-core'
import { Equals } from '@waiting/shared-types'

import { DbDict } from '../src/index'

import { Db, Db2 } from './test3.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {

  describe('Should DbDict works', () => {
    type K1 = DbDict<Db>
    type K2 = DbDict<Db2> // with extra Db2.tb_user.pwd
    const foo = { } as K1
    const foo2 = { } as K2

    it('normal', () => {
      type F1 = K1['scoped']['tb_user']['uid']
      const t11: Equals<F1, 'tb_user.uid'> = true
      const t12: Equals<F1, 'tb_user.name'> = false
      const t13: Equals<F1, 'uid'> = false
      const t14: Equals<F1, string> = false

      type F2 = typeof foo.scoped.tb_user.uid
      const t21: Equals<F2, 'tb_user.uid'> = true
      const t22: Equals<F2, 'tb_user.name'> = false
      const t23: Equals<F2, 'uid'> = false
      const t24: Equals<F2, string> = false

      type F3 = typeof foo.scoped.tb_user_ext.last_login_time
      const t31: Equals<F3, 'tb_user_ext.last_login_time'> = true
      const t32: Equals<F3, 'tb_user_ext.name'> = false
      const t33: Equals<F3, 'uid'> = false
      const t34: Equals<F3, string> = false
    })
    it('extra field', () => {
      type F1 = K2['scoped']['tb_user']['uid']
      const t11: Equals<F1, 'tb_user.uid'> = true
      const t12: Equals<F1, 'tb_user.name'> = false
      const t13: Equals<F1, 'uid'> = false
      const t14: Equals<F1, string> = false

      type F2 = typeof foo2.scoped.tb_user.uid
      const t21: Equals<F2, 'tb_user.uid'> = true
      const t22: Equals<F2, 'tb_user.name'> = false
      const t23: Equals<F2, 'uid'> = false
      const t24: Equals<F2, string> = false

      type F3 = K2['scoped']['tb_user']['pwd']
      const t31: Equals<F3, 'tb_user.pwd'> = true
      const t32: Equals<F3, 'pwd'> = false
      const t33: Equals<F3, string> = false

      type F4 = typeof foo2.scoped.tb_user.pwd
      const t41: Equals<F4, 'tb_user.pwd'> = true
      const t42: Equals<F4, 'pwd'> = false
      const t43: Equals<F4, string> = false

      type F5 = typeof foo2.scoped.tb_user_ext.last_login_time
      const t51: Equals<F5, 'tb_user_ext.last_login_time'> = true
      const t52: Equals<F5, 'pwd'> = false
      const t53: Equals<F5, string> = false
    })
  })


})

