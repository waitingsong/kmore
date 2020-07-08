import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, Kmore, DbDict } from '../src/index'

import { config, dbDict } from './test.config'
import { Db } from './test.model'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should passing tables works', () => {
    it('pass dbDictBase', async () => {
      const km = kmore<Db>({ config }, dbDict)

      assert(km.tables && Object.keys(km.tables).length)

      const { tables } = km
      assert(tables !== dbDict.tables)
      Object.keys(tables).forEach((key) => {
        assert(typeof dbDict.tables[key] === 'string')
        assert(dbDict.tables[key] === tables[key])
      })
      await km.dbh.destroy() // !
    })

    it('pass null', async () => {
      const km = kmore<Db>({ config }, null)

      assert(km.tables && Object.keys(km.tables).length)

      const { tables } = km
      assert(tables !== dbDict.tables)
      Object.keys(tables).forEach((key) => {
        assert(typeof dbDict.tables[key] === 'string')
        assert(dbDict.tables[key] === tables[key])
      })
      await km.dbh.destroy()
    })

    it('pass undefined', async () => {
      const km = kmore<Db>({ config }, void 0)

      assert(km.tables && Object.keys(km.tables).length)

      const { tables } = km
      assert(tables !== dbDict.tables)
      Object.keys(tables).forEach((key) => {
        assert(typeof dbDict.tables[key] === 'string')
        assert(dbDict.tables[key] === tables[key])
      })
      await km.dbh.destroy()
    })

    it('pass invalid empty object', async () => {
      try {
        kmore<Db>({ config }, {} as DbDict<Db>)
      }
      catch (ex) {
        return
      }
      assert(false, 'Should throw error, but not.')
    })
  })

})

