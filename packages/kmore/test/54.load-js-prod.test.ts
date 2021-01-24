import { basename } from '@waiting/shared-core'

import { dbDict2 } from './config/test.config2'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {

  describe('Should loading tables works', () => {
    it('normal', () => {
      assert(dbDict2 && Object.keys(dbDict2).length)
      console.log(JSON.stringify(dbDict2, null, 2))
    })
  })

})

