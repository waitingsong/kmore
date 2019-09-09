import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore } from '../src/index'

import { config } from './test.config'
import { TbListModel } from './test.model'
import { dropTables } from './helper'


const filename = basename(__filename)

describe(filename, () => {
  const db = kmore<TbListModel>(config)
  assert(db.tables && Object.keys(db.tables).length > 0)

  after(async () => {
    await db.dbh.destroy() // !
  })

  it('Should drop table works', async () => {
    try {
      await dropTables(db.dbh, Object.values(db.tables))
    }
    catch (ex) {
      assert(false, ex)
    }
  })

})
