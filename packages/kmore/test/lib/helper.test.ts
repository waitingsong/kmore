import assert from 'assert/strict'
import { relative } from 'path'

import { genCamelKeysFrom, genSnakeKeysFrom } from '../../src/index'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

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
      // assert(ret.fooBarz.firstName === 'name')
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
        foo2: 2,
        foo_barz: {
          first_name: 'name',
          sec_name: 'secName',
        },
      } as const
      const ret = genSnakeKeysFrom(input)
      assert(ret.foo_barz.sec_name === 'secName')
      assert.deepStrictEqual(ret, expected)
    })

  })

})

