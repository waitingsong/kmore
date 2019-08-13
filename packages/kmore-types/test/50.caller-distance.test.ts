import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { validateParamTables } from '../src/lib/util'

import { tbList3 } from './config/test.config3'
import { tbList31 } from './config/test.config31'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should validateTables() works', () => {
    it('with valid value', () => {
      assert(Object.keys(tbList3).length > 0)
      try {
        console.log(tbList3)
        assert(Object.keys(tbList3).length > 0)
        validateParamTables(tbList3)
      }
      catch (ex) {
        assert(false, ex)
      }
    })

    it('with valid value', () => {
      assert(Object.keys(tbList31).length > 0)
      try {
        console.log(tbList31)
        assert(Object.keys(tbList31).length > 0)
        validateParamTables(tbList31)
      }
      catch (ex) {
        assert(false, ex)
      }
    })
  })


})
