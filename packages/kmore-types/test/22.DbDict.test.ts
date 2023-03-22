import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { DbDict } from '../src/index.js'

import { expectedDict, expectedDict3 } from './demo-config.js'
import { Db, Db3 } from './test3.model.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should DbDict works', () => {
    it('normal', () => {
      type Foo = DbDict<Db>
      const foo: Foo = {
        ...expectedDict,
      }
      assert(foo)
    })

    it('Db3', () => {
      type Foo = DbDict<Db3>
      const foo: Foo = {
        ...expectedDict3,
      }
      assert(foo)
    })
  })

})

