import { basename } from '@waiting/shared-core'

import { validateParamTables } from '../src/lib/util'

import { dbDict3 } from './config/test.config3'
import { dbDict31 } from './config/test.config31'

// eslint-disable-next-line import/order
import assert = require('power-assert')


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
