import { basename, rimraf, pathResolve } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

import { config } from './test.config'
import { TbListModel as TbModelAlias } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let db: DbModel<TbModelAlias>

  before(async () => {
    db = kmore<TbModelAlias>({ config })
    assert(db.tables && Object.keys(db.tables).length > 0)
  })

  after(async () => {
    await db.dbh.destroy() // !
  })

  describe('Should loading tables works', () => {
    it('normal', () => {
      assert(db.tables && Object.keys(db.tables).length)
    })
  })

})
