import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import type { DbDictType } from '../src/index.js'

import { expectedColsTypeDb } from './demo-config.js'
import type { Db } from './test3.model.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should DictColumnsType works', () => {
    it('normal', () => {
      type DDT = DbDictType<Db>

      const foo: DDT = {
        ...expectedColsTypeDb,
      }
      assert(foo)
    })
  })

})

