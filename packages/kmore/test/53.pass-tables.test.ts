import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel, KTables } from '../src/index'

import { config, kTables } from './test.config'
import { TbListModel } from './test.model'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should passing tables works', () => {
    it('pass kTablesBase', async () => {
      const db = kmore<TbListModel>({ config }, kTables)

      assert(db.tables && Object.keys(db.tables).length)

      const { tables } = db
      assert(tables !== kTables.tables)
      Object.keys(tables).forEach((key) => {
        assert(typeof kTables.tables[key] === 'string')
        assert(kTables.tables[key] === tables[key])
      })
      await db.dbh.destroy() // !
    })

    it('pass null', async () => {
      const db = kmore<TbListModel>({ config }, null)

      assert(db.tables && Object.keys(db.tables).length)

      const { tables } = db
      assert(tables !== kTables.tables)
      Object.keys(tables).forEach((key) => {
        assert(typeof kTables.tables[key] === 'string')
        assert(kTables.tables[key] === tables[key])
      })
      await db.dbh.destroy()
    })

    it('pass undefined', async () => {
      const db = kmore<TbListModel>({ config }, void 0)

      assert(db.tables && Object.keys(db.tables).length)

      const { tables } = db
      assert(tables !== kTables.tables)
      Object.keys(tables).forEach((key) => {
        assert(typeof kTables.tables[key] === 'string')
        assert(kTables.tables[key] === tables[key])
      })
      await db.dbh.destroy()
    })

    it('pass invalid empty object', async () => {
      try {
        kmore<TbListModel>({ config }, {} as KTables<TbListModel>)
      }
      catch (ex) {
        return
      }
      assert(false, 'Should throw error, but not.')
    })
  })

})

