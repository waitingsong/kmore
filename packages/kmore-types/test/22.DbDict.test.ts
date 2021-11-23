/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { relative } from 'path'

import { DbDict } from '../src/index'

import { expectedDict } from './demo-config'
import { Db, Db2 } from './test3.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


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

