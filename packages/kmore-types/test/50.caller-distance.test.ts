import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { validateParamTables } from '../src/lib/util'

import { dbDict3 } from './config/test.config3'
import { dbDict31 } from './config/test.config31'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should validateTables() works', () => {
    it('with valid value 3', () => {
      console.log(dbDict3.tables)
      assert(Object.keys(dbDict3.tables).length > 0)
      validateParamTables(dbDict3.tables)
    })

    it('with valid value 31', () => {
      console.log(dbDict31.tables)
      assert(Object.keys(dbDict31.tables).length > 0)
      validateParamTables(dbDict31.tables)
    })
  })

})
