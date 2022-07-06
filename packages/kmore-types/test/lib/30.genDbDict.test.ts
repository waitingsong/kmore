import assert from 'assert/strict'
import { relative } from 'path'

import { genDbDict, DbDict } from '../../src/index'
import { expectedDict } from '../demo-config'
import { Db } from '../test3.model'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

  describe('Should works', () => {
    it('normal', () => {
      const dict: DbDict<Db> = genDbDict<Db>()
      assert(dict)
      assert.deepStrictEqual(dict, expectedDict)
    })
  })

})

