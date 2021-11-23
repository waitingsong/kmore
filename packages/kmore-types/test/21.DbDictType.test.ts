/* eslint-disable import/order */
import { relative } from 'path'

import { DbDictType } from '../src/index'

import { expectedColsTypeDb } from './demo-config'
import { Db } from './test3.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

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

