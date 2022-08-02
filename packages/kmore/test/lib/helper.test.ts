import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { genCamelKeysFrom, genSnakeKeysFrom } from '../../src/lib/helper.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should genCamelKeysFrom() work', () => {
    it('tb_user', async () => {
      const input = {
        foo_bar: 1,
        foo_2: 2,
        foo_barz: {
          first_name: 'name',
          lastName: 'foo',
        },
      } as const
      const expected = {
        fooBar: 1,
        foo2: 2,
        fooBarz: {
          first_name: 'name',
          lastName: 'foo',
        },
      }
      const ret = genCamelKeysFrom(input)
      assert(ret.fooBarz.first_name === 'name')
      assert(ret.fooBarz.lastName === 'foo')
      assert.deepStrictEqual(ret, expected)
    })

  })

  describe('Should genSnakeKeysFrom() work', () => {
    it('tb_user', async () => {
      const input = {
        fooBar: 1,
        foo2: 2,
        fooBarz: {
          first_name: 'name',
          secName: 'secName',
        },
      }
      const expected = {
        foo_bar: 1,
        foo_2: 2,
        foo_barz: {
          first_name: 'name',
          secName: 'secName',
        },
      } as const
      const ret = genSnakeKeysFrom(input)
      assert(ret.foo_2 === 2)
      assert(ret.foo_barz.secName === 'secName')
      assert.deepStrictEqual(ret, expected)
    })

  })

})

