import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import {
  kmore,
  DbModel,
} from '../src/index'
import { initOptions, cacheMap } from '../src/lib/config'
import { genTbListFromType } from '../src/lib/compiler'

import { config } from './test.config'
import { TbListModel, TbListModelAlias } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let db: DbModel<TbListModel>

  before(() => {
    db = kmore<TbListModel>(config)
  })
  after(async () => {
    await db.dbh.destroy() // !
  })

  describe('Should genTbListFromType() works', () => {
    it('with noraml type', () => {
      const { tables, rb } = db
      const ret = genTbListFromType<TbListModel>()

      assert(ret && Object.keys(ret).length === Object.keys(tables).length)
      Object.keys(ret).forEach((tb) => {
        assert(typeof tables[tb] === 'string', `Should tables.includes("${tb}")`)
      })
    })

    it('with alias type', () => {
      const { tables } = db
      const ret = genTbListFromType<TbListModelAlias>()

      assert(ret && Object.keys(ret).length === Object.keys(tables).length)
      Object.keys(ret).forEach((tb) => {
        assert(typeof tables[tb] === 'string', `Should tables.includes("${tb}")`)
      })
    })
  })


  describe('Should assignment of tablesRef name works', () => {
    it('normal', () => {
      const { tables, rb } = db
      Object.keys(tables).forEach((tb) => {
        const tbRef = rb[tb]
        assert(typeof tbRef === 'function')
        assert(tbRef.name === `${initOptions.refTablesPrefix}${tb}`)
      })
    })
  })



})
