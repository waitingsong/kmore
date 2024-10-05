import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import type { DbDict } from '../../src/index.js'
import { genDbDict } from '../../src/index.js'
import { expectedDict } from '../demo-config.js'
import type { Db } from '../test3.model.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should works', () => {
    it('normal', () => {
      const dict: DbDict<Db> = genDbDict<Db>()
      assert(dict)
      assert.deepStrictEqual(dict, expectedDict)
    })
  })

})

