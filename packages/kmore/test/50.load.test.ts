import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, Kmore } from '../src/index'

import { config } from './test.config'
import { Db } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let km: Kmore<Db>

  before(() => {
    km = kmore<Db>({ config })
    assert(km.tables && Object.keys(km.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should loading tables works', () => {
    it('normal', () => {
      assert(km.tables && Object.keys(km.tables).length)
    })
  })

})
