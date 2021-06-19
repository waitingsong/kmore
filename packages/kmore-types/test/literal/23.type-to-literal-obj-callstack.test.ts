/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  basename,
  join,
} from '@waiting/shared-core'

import { expectedDict } from '../demo-config'

import { Db, genDbDict, alter, fake } from './demo6'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {

  describe('Should computeCallExpressionToLiteralObj works', () => {
    it('w/o needle', async () => {
      const ret = alter<Db>()
      assert.deepStrictEqual(ret, expectedDict)
    })

    it('with needle', async () => {
      const ret = genDbDict<Db>()
      assert.deepStrictEqual(ret, expectedDict)
    })

    it('fake', async () => {
      try {
        const ret = fake<Db>()
        void ret
      }
      catch (ex) {
        return
      }
      assert(false, 'Should throw error, but not')
    })
  })

})

