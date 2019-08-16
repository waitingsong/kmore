import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

import { config, tbList } from './test.config'
import { TbListModel } from './test.model'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should passing tables works', () => {
    it('pass tbList', async () => {
      const db = kmore<TbListModel>(
        config,
        tbList,
      )

      assert(db.tables && Object.keys(db.tables).length)

      const { tables } = db
      assert(tables !== tbList)
      Object.keys(tables).forEach((key) => {
        assert(typeof tbList[key] === 'string')
        assert(tbList[key] === tables[key])
      })
      await db.dbh.destroy() // !
    })

    it('pass null', async () => {
      const db = kmore<TbListModel>(
        config,
        null,
      )

      assert(db.tables && Object.keys(db.tables).length)

      const { tables } = db
      assert(tables !== tbList)
      Object.keys(tables).forEach((key) => {
        assert(typeof tbList[key] === 'string')
        assert(tbList[key] === tables[key])
      })
      await db.dbh.destroy()
    })

    it('pass undefined', async () => {
      const db = kmore<TbListModel>(
        config,
        void 0,
      )

      assert(db.tables && Object.keys(db.tables).length)

      const { tables } = db
      assert(tables !== tbList)
      Object.keys(tables).forEach((key) => {
        assert(typeof tbList[key] === 'string')
        assert(tbList[key] === tables[key])
      })
      await db.dbh.destroy()
    })


    it('pass false ', async () => {
      const db = kmore<TbListModel>(
        config,
        false,
      )

      assert(typeof db.tables === 'object' && Object.keys(db.tables).length === 0)
      assert(typeof db.rb.tb_user === 'undefined')
      assert(typeof db.rb.tb_user_detail === 'undefined')

      await db.dbh.destroy()
    })

    it('pass invalid empty object', async () => {
      const db = kmore<TbListModel>(
        config,
        // @ts-ignore
        {},
      )

      assert(typeof db.tables === 'object' && Object.keys(db.tables).length === 0)
      assert(typeof db.rb.tb_user === 'undefined')
      assert(typeof db.rb.tb_user_detail === 'undefined')

      await db.dbh.destroy()
    })
  })

})
