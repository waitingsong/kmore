import { basename } from '@waiting/shared-core'
import { genDbDictFromType } from 'kmore-types'
import * as assert from 'power-assert'

import {
  kmore,
  Kmore,
} from '../src/index'
import { initOptions, cacheMap } from '../src/lib/config'

import { config } from './test.config'
import { Db, DbAlias } from './test.model'


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

  describe('Should genDbDictFromType() works', () => {
    it('with normal type', () => {
      const { tables, rb } = km
      const ret = genDbDictFromType<Db>()

      assert(ret && Object.keys(ret.tables).length === Object.keys(tables).length)
      Object.keys(ret.tables).forEach((tb) => {
        assert(typeof tables[tb] === 'string', `Should tables.includes("${tb}")`)
      })
    })

    it('with alias type', () => {
      const { tables } = km
      const ret = genDbDictFromType<DbAlias>()

      assert(ret && Object.keys(ret.tables).length === Object.keys(tables).length)
      Object.keys(ret.tables).forEach((tb) => {
        assert(typeof tables[tb] === 'string', `Should tables.includes("${tb}")`)
      })
    })
  })


  describe('Should assignment of tablesRef name works', () => {
    it('normal', () => {
      const { tables, rb } = km
      Object.keys(tables).forEach((tb) => {
        const tbRef = rb[tb]
        assert(typeof tbRef === 'function')
        assert(tbRef.name === `${initOptions.refTablesPrefix}${tb}`)
      })
    })
  })


})
