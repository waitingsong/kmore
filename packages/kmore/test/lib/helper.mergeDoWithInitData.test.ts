import assert from 'assert/strict'
import { relative } from 'path'

import { mergeDoWithInitData } from '../../src/index'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

  describe('Should work', () => {
    it('nomral', async () => {
      const initDoUser = {
        name: 'foo',
        foo_bar: 1,
        foo_2: 2,
        foo_barz: {
          first_name: 'name',
          lastName: 'foo',
        },
      }

      const input = {
        id: 1,
        foo_bar: 2,
      }

      const expected = {
        ...initDoUser,
        foo_bar: 2,
      }
      const ret = mergeDoWithInitData(initDoUser, input)
      assert.deepStrictEqual(ret, expected)
    })

  })

})

