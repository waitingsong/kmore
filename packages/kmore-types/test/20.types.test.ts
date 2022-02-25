import assert from 'assert/strict'
import { relative } from 'path'

import {
  DictColumns,
  DictTables,
} from '../src/lib/types'

import { expectedDict } from './demo-config'
import { Db, Db2 } from './test3.model'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

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

