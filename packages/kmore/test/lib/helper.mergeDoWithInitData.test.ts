import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { mergeDoWithInitData } from '../../src/index.js'


describe(fileShortPath(import.meta.url), () => {

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

