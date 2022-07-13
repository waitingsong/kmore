import assert from 'assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { genDbDict, DbDict } from '../../src/index.js'
import { expectedDict } from '../demo-config.js'
import { Db } from '../test3.model.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should works', () => {
    it('normal', () => {
      const dict: DbDict<Db> = genDbDict<Db>()
      assert(dict)
      assert.deepStrictEqual(dict, expectedDict)
    })
  })

})

