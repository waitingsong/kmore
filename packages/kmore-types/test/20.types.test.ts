import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import type {
  DictColumns,
  DictTables,
} from '../src/lib/types.js'

import { expectedDict } from './demo-config.js'
import type { Db } from './test3.model.js'
import { Db2 } from './test3.model.js'


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

