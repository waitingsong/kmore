import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { CreateColumnNameOpts } from '../../src'
import { genDbDictFromBase } from '../../src/lib/util'
import { dbDict4, dbDict4Base, dbDict4Empty } from '../config/test.config4'
import { dbDict } from '../test.config'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should scopedColumn works', () => {
    it('access dbDict.scopedColumns.tb_user.ctime', () => {
      const ctime = dbDict.scopedColumns.tb_user.ctime
      assert(typeof ctime === 'string' && ctime)

      const concatedCtime = `${dbDict.tables.tb_user}.${dbDict.columns.tb_user.ctime}`
      assert(concatedCtime === ctime)
    })

    it('access cached dbDict.scopedColumns.tb_user.ctime', () => {
      const ctime = dbDict.scopedColumns.tb_user.ctime
      assert(typeof ctime === 'string' && ctime)

      const ctimeCached = dbDict.scopedColumns.tb_user.ctime
      assert(ctimeCached === ctime)

      const concatedCtime = `${dbDict.tables.tb_user}.${dbDict.columns.tb_user.ctime}`
      assert(concatedCtime === ctime)
    })

    it('spread with accessing dbDict.scopedColumns', () => {
      const { tb_user: tbUser } = dbDict.scopedColumns
      const { ctime } = tbUser
      assert(typeof ctime === 'string' && ctime)

      const ctime2 = tbUser.ctime
      assert(ctime2 === ctime)

      const concatedCtime = `${dbDict.tables.tb_user}.${dbDict.columns.tb_user.ctime}`
      assert(concatedCtime === ctime)
    })
  })


  describe('Should genDbDictFromBase() works', () => {
    it('2nd param ignored if first param is type DbDict', () => {
      const random = Math.random().toString()

      assert(dbDict4 && dbDict4.tables)
      const kdd = genDbDictFromBase(dbDict4, (opts: CreateColumnNameOpts) => {
        const { tableName, columnName } = opts
        return `${tableName}.${columnName}${random}`
      })

      const ctime = kdd.scopedColumns.tb_user.ctime
      assert(ctime && ! ctime.endsWith(random))

      const kdd2 = genDbDictFromBase(dbDict4, false)
      const ctime2 = kdd2.scopedColumns.tb_user.ctime
      assert(ctime2 && ctime)
    })

    it('custom 2nd param', () => {
      const random = Math.random().toString()

      assert(dbDict4Base && dbDict4Base.tables)
      const kdd = genDbDictFromBase(dbDict4Base, (opts: CreateColumnNameOpts) => {
        const { tableName, columnName } = opts
        return `${tableName}.${columnName}${random}`
      })

      const ctime = kdd.scopedColumns.tb_user.ctime
      assert(ctime && ctime.endsWith(random))

      const kdd2 = genDbDictFromBase(dbDict4, false)
      const ctime2 = kdd2.scopedColumns.tb_user.ctime
      assert(ctime2 && ctime)
    })

    it('with invalid 1st param', () => {
      try {
        genDbDictFromBase(dbDict4Empty)
      }
      catch (ex) {
        return
      }
      assert(false, 'Should throw error, but not.')
    })
  })

})

