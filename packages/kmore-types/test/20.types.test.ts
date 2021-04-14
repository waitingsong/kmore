/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { basename } from '@waiting/shared-core'

import {
  DictColumns,
  DictTables,
} from '../src/lib/types'

import { expectedDict } from './demo-config'
import { Db, Db2 } from './test3.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {

  describe('Should DbTableNames works', () => {
    it('normal', () => {
      type Foo = DictTables<Db>
      const foo: Foo = {
        ...expectedDict.tables,
      }
      assert(foo)
    })
  })

  describe('Should DbTablesColNames works', () => {
    it('normal', () => {
      type Foo = DictColumns<Db>
      const foo: Foo = {
        ...expectedDict.columns,
      }
      assert(foo)
    })
  })

})

