import { fileShortPath } from '@waiting/shared-core'
import type { Equals } from '@waiting/shared-types'

import type { CamelAliasColumns } from '../../src/index.js'
import type { Db } from '../test3.model.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should works', () => {
    it('normal', () => {
      type Foo = CamelAliasColumns<Db['tb_user_ext'], 'tb_user'>
      interface T1 {
        uid: {
          uid: 'tb_user.uid',
        }
        age: {
          age: 'tb_user.age',
        }
        address: {
          address: 'tb_user.address',
        }
        last_login_time: {
          lastLoginTime: 'tb_user.last_login_time',
        }
      }
      const t1: Equals<Foo, T1> = true
    })
  })

})

