import { basename } from '@waiting/shared-core'
import { validateParamTables } from 'kmore-types'
import * as assert from 'power-assert'

import { kTablesBase3 } from './config/test.config3'
import { kTables31 } from './config/test.config31'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should validateTables() works', () => {
    it('with valid value', () => {
      assert(Object.keys(kTablesBase3.tables).length > 0)
      validateParamTables(kTablesBase3.tables)
    })

    it('with valid value', () => {
      assert(Object.keys(kTables31.tables).length > 0)
      validateParamTables(kTables31.tables)
    })
  })

})
