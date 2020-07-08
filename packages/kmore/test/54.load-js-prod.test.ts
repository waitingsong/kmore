import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { dbDict2 } from './config/test.config2'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should loading tables works', () => {
    it('normal', () => {
      assert(dbDict2 && Object.keys(dbDict2).length)
      console.log(JSON.stringify(dbDict2, null, 2))
    })
  })

})

