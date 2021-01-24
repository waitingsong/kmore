import { basename } from '@waiting/shared-core'

import { includeExportTypeName } from '../../src/lib/util'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {

  describe('Should includeExportTypeName works', () => {
    const content = 'export interface DbDict {}'
    it('normal', () => {
      assert(includeExportTypeName(content, 'DbDict') === true)
      assert(includeExportTypeName(content, 'DbDict  ') === true)
      assert(includeExportTypeName(content, '  DbDict  ') === true)

      assert(includeExportTypeName(content, 'Dict') === false)
      assert(includeExportTypeName(content, 'dbDict') === false)
      assert(includeExportTypeName(content, 'DbDict2') === false)
    })
  })

})

