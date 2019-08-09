import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

import { config } from './test.config'
import { TbListModel } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let db: DbModel<TbListModel>

  before(async () => {
    db = kmore<TbListModel>(config)
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
