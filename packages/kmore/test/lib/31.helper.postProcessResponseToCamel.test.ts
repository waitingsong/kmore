import assert from 'node:assert/strict'
import { relative } from 'node:path'

import { postProcessResponseToCamel } from '../../src/index'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

  describe('Should postProcessResponseToCamel() work', () => {
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
      const ret = postProcessResponseToCamel(input, void 0)
      assert(ret.fooBarz.first_name === 'name')
      assert(ret.fooBarz.lastName === 'foo')
      assert.deepStrictEqual(ret, expected)
    })

    it('array', async () => {
      const rnd = Math.random().toString()
      const input = ['foo', 'bar', rnd, true, null, '']
      const expected = ['foo', 'bar', rnd, true, null, '']
      const ret = postProcessResponseToCamel(input, void 0)
      assert.deepStrictEqual(ret, expected)
    })
  })

})

