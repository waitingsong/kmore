/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { basename } from '@waiting/shared-core'
import { Equals } from '@waiting/shared-types'
import * as assert from 'power-assert'

import { DbDictBase } from '../src/index'

import { Db, Db2, KDB } from './test.model'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should DbDictBase works with 2nd generics param', () => {
    type K1 = DbDictBase<Db, KDB>
    type K2 = DbDictBase<Db2, KDB> // with extra Db2.tb_user.pwd
    const foo = { } as K1
    const foo2 = { } as K2

    it('normal', () => {
      type F1 = K1['columns']['tb_user']['uid']
      const t11: Equals<F1, 'uid'> = true
      const t12: Equals<F1, 'name'> = false
      const t13: Equals<F1, string> = false

      type F2 = typeof foo.columns.tb_user.uid
      const t21: Equals<F2, 'uid'> = true
      const t22: Equals<F2, 'name'> = false
      const t23: Equals<F2, string> = false
    })
    it('extra field', () => {
      type F1 = K2['columns']['tb_user']['uid']
      const t11: Equals<F1, 'uid'> = true
      const t12: Equals<F1, 'name'> = false
      const t13: Equals<F1, string> = false

      type F2 = typeof foo2.columns.tb_user.uid
      const t21: Equals<F2, 'uid'> = true
      const t22: Equals<F2, 'name'> = false
      const t23: Equals<F2, string> = false

      type F3 = K2['columns']['tb_user']['pwd']
      const t31: Equals<F3, 'pwd'> = false
      const t32: Equals<F3, 'name'> = false
      const t33: Equals<F3, string> = true

      type F4 = typeof foo2.columns.tb_user.pwd
      const t41: Equals<F4, 'pwd'> = false
      const t42: Equals<F4, 'name'> = false
      const t43: Equals<F4, string> = true
    })
  })

  describe('Should DbDictBase works w/o 2nd generics param', () => {
    type K1 = DbDictBase<Db>
    type K2 = DbDictBase<Db2> // with extra Db2.tb_user.pwd
    const foo = { } as K1
    const foo2 = { } as K2

    it('normal', () => {
      type F1 = K1['columns']['tb_user']['uid']
      const t11: Equals<F1, 'uid'> = false
      const t12: Equals<F1, 'name'> = false
      const t13: Equals<F1, string> = true

      type F2 = typeof foo.columns.tb_user.uid
      const t21: Equals<F2, 'uid'> = false
      const t22: Equals<F2, 'name'> = false
      const t23: Equals<F2, string> = true
    })
    it('extra field', () => {
      type F1 = K2['columns']['tb_user']['uid']
      const t11: Equals<F1, 'uid'> = false
      const t12: Equals<F1, 'name'> = false
      const t13: Equals<F1, string> = true

      type F2 = typeof foo2.columns.tb_user.uid
      const t21: Equals<F2, 'uid'> = false
      const t22: Equals<F2, 'name'> = false
      const t23: Equals<F2, string> = true

      type F3 = K2['columns']['tb_user']['pwd']
      const t31: Equals<F3, 'uid'> = false
      const t32: Equals<F3, 'name'> = false
      const t33: Equals<F3, string> = true

      type F4 = typeof foo2.columns.tb_user.pwd
      const t41: Equals<F4, 'uid'> = false
      const t42: Equals<F4, 'name'> = false
      const t43: Equals<F4, string> = true
    })
  })

})

