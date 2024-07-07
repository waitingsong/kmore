import assert from 'assert/strict'

import { fileShortPath } from '@waiting/shared-core'
import type { Equals } from '@waiting/shared-types'

import type { AliasColumns } from '../../src/index.js'
import { expectedDict } from '../demo-config.js'
import type { Db } from '../test3.model.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should works', () => {
    it('normal', () => {
      type Foo = AliasColumns<Db['tb_user_ext'], 'tb_user'>

      interface T1 {
        uid: {
          tbUserUid: 'tb_user.uid',
        }
        age: {
          tbUserAge: 'tb_user.age',
        }
        address: {
          tbUserAddress: 'tb_user.address',
        }
        last_login_time: {
          tbUserLastLoginTime: 'tb_user.last_login_time',
        }
      }
      const t1: Equals<Foo, T1> = true
    })
  })

})

