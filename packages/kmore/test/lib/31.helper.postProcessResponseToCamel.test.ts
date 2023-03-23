import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { postProcessResponseToCamel } from '../../src/lib/helper.js'


describe(fileShortPath(import.meta.url), () => {

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
        foo_2: 2,
        fooBarz: {
          first_name: 'name',
          lastName: 'foo',
        },
      }
      const ret = postProcessResponseToCamel(input, void 0)
      assert(ret.fooBarz.first_name === 'name')
      assert(ret.fooBarz.lastName === 'foo')
      assert(ret.foo_2)
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

