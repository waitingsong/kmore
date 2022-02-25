import assert from 'assert/strict'
import { relative } from 'path'

import { Equals } from '@waiting/shared-types'

import { DbDict } from '../src/index'

import { Db, Db2 } from './test3.model'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

  describe('Should DbDict works', () => {
    type K1 = DbDict<Db>
    type K2 = DbDict<Db2> // with extra Db2.tb_user.pwd
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

})

