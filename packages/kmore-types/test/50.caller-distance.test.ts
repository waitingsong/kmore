import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { validateParamTables } from '../src/lib/util'

import { tbList3 } from './config/test.config3'
import { tbList31 } from './config/test.config31'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should validateTables() works', () => {
    it('with valid value 3', () => {
      console.log(tbList3.tables)
      assert(Object.keys(tbList3.tables).length > 0)
      validateParamTables(tbList3.tables)
    })

    it('with valid value 31', () => {
      console.log(tbList31.tables)
      assert(Object.keys(tbList31.tables).length > 0)
      validateParamTables(tbList31.tables)
    })
  })

})
