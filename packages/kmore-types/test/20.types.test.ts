import assert from 'assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import {
  DictColumns,
  DictTables,
} from '../src/lib/types.js'

import { expectedDict } from './demo-config.js'
import { Db, Db2 } from './test3.model.js'


describe(fileShortPath(import.meta.url), () => {

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

