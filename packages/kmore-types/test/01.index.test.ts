import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import * as Src from '##/index.js'


describe(fileShortPath(import.meta.url), () => {

  describe('should work', () => {
    it('foo', () => {
      assert(typeof Src === 'object', 'typeof Src !== "object"')
      // @ts-expect-error
      if (typeof Src.foo === 'number') {
        // @ts-expect-error
        assert(Src.foo === 1)
      }
    })
  })

})

