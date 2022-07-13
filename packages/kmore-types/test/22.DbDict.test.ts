import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { DbDict } from '../src/index.js'

import { expectedDict } from './demo-config.js'
import { Db, Db2 } from './test3.model.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should DbDict works', () => {
    it('normal', () => {
      type Foo = DbDict<Db>
      const foo: Foo = {
        ...expectedDict,
      }
      assert(foo)
    })
  })

})

