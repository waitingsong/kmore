/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { basename } from '@waiting/shared-core'
import { Equals } from '@waiting/shared-types'

import { DbDict } from '../src/index'

import { Db, Db2, KDD } from './test.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {

  describe('Should DbDict works with 2nd generics param', () => {
    type K1 = DbDict<Db, KDD>
    type K2 = DbDict<Db2, KDD> // with extra Db2.tb_user.pwd
    const foo = { } as K1
    const foo2 = { } as K2

    it('normal', () => {
      type F1 = K1['tables']['tb_user']
      const t11: Equals<F1, 'tb_user'> = true
      const t12: Equals<F1, 'tb_user_detail'> = false
      const t13: Equals<F1, string> = false

      type F2 = typeof foo.tables.tb_user
      const t21: Equals<F1, 'tb_user'> = true
      const t22: Equals<F1, 'tb_user_detail'> = false
      const t23: Equals<F1, string> = false
    })
  })

  describe('Should DbDict works w/o 2nd generics param', () => {
    type K1 = DbDict<Db>
    type K2 = DbDict<Db2> // with extra Db2.tb_user.pwd
    const foo = { } as K1
    const foo2 = { } as K2

    it('normal', () => {
      type F1 = K1['tables']['tb_user']
      const t11: Equals<F1, 'tb_user'> = false
      const t12: Equals<F1, 'tb_user_detail'> = false
      const t13: Equals<F1, string> = true

      type F2 = typeof foo.tables.tb_user
      const t21: Equals<F1, 'tb_user'> = false
      const t22: Equals<F1, 'tb_user_detail'> = false
      const t23: Equals<F1, string> = true
    })
  })

})

