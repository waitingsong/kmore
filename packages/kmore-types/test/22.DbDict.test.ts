import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import type { DbDict } from '../src/index.js'

import { expectedDict3, expectedDict } from './demo-config.js'
import type { Db3, Db } from './test3.model.js'


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

