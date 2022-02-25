import assert from 'assert/strict'
import { relative } from 'path'

import { DbDict } from '../src/index'

import { expectedDict } from './demo-config'
import { Db, Db2 } from './test3.model'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

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

