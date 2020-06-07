import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import {
  kmore,
  DbModel,
  getCurrentTime,
  EnumClient,
} from '../src/index'

import { config } from './test.config'
import { TbListModel, TbListModelAlias } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let db: DbModel<TbListModel>

  before(() => {
    db = kmore<TbListModel>({ config })
    assert(db.tables && Object.keys(db.tables).length > 0)
  })
  after(async () => {
    await db.dbh.destroy() // !
  })

  describe('Should getCurrentTime() works', () => {
    it('with pg', async () => {
      const time = await getCurrentTime(db.dbh, EnumClient.pg)
      assert(time)
    })

    it('with invalid client value', async () => {
      try {
        await getCurrentTime(db.dbh, '')
      }
      catch (ex) {
        assert(true)
        return
      }
      assert(false, 'Should throw error, but not.')
    })
  })

})

