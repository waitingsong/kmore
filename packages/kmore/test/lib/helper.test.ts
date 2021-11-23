import { basename } from '@waiting/shared-core'

import { genCamelKeysFrom, genSnakeKeysFrom } from '../../src/index'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {

  describe('Should genCamelKeysFrom() work', () => {
    it('tb_user', async () => {
      const input = {
        foo_bar: 1,
        foo_2: 2,
        foo_barz: {
          first_name: 'name',
        },
      } as const
      const expected = {
        fooBar: 1,
        foo2: 2,
        fooBarz: {
          first_name: 'name',
        },
      }
      const ret = genCamelKeysFrom(input)
      assert.deepStrictEqual(ret, expected)
    })

  })

})

