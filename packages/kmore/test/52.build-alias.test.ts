import { basename, rimraf, pathResolve } from '@waiting/shared-core'
import { kmore, Kmore } from '../src/index'

import { config } from './test.config'
import { Db as TbModelAlias } from './test.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {
  let km: Kmore<TbModelAlias>

  before(async () => {
    km = kmore<TbModelAlias>({ config })
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
