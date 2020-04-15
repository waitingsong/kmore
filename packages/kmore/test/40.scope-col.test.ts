import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { CreateColumnNameOpts } from '../src'
import { genKTablesFromBase } from '../src/lib/util'

import { kTablesBase3, kTablesBase4 } from './config/test.config3'
import { kTables } from './test.config'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should scopedColumn works', () => {
    it('access kTables.scopedColumns.tb_user.ctime', () => {
      const ctime = kTables.scopedColumns.tb_user.ctime
      assert(typeof ctime === 'string' && ctime)

      const concatedCtime = `${kTables.tables.tb_user}.${kTables.columns.tb_user.ctime}`
      assert(concatedCtime === ctime)
    })

    it('access cached kTables.scopedColumns.tb_user.ctime', () => {
      const ctime = kTables.scopedColumns.tb_user.ctime
      assert(typeof ctime === 'string' && ctime)

      const ctimeCached = kTables.scopedColumns.tb_user.ctime
      assert(ctimeCached === ctime)

      const concatedCtime = `${kTables.tables.tb_user}.${kTables.columns.tb_user.ctime}`
      assert(concatedCtime === ctime)
    })

    it('spread with accessing kTables.scopedColumns', () => {
      const { tb_user: tbUser } = kTables.scopedColumns
      const { ctime } = tbUser
      assert(typeof ctime === 'string' && ctime)

      const ctime2 = tbUser.ctime
      assert(ctime2 === ctime)

      const concatedCtime = `${kTables.tables.tb_user}.${kTables.columns.tb_user.ctime}`
      assert(concatedCtime === ctime)
    })
  })


  describe('Should genKTablesFromBase() works', () => {
    it('createColumnNameFn()', () => {
      const random = Math.random().toString()

      const ktbs = genKTablesFromBase(kTablesBase3, (opts: CreateColumnNameOpts) => {
        const { tableName, columnName } = opts
        return `${tableName}.${columnName}${random}`
      })

      const ctime = ktbs.scopedColumns.tb_user.ctime
      assert(ctime && ctime.endsWith(random))

      const ktbs2 = genKTablesFromBase(kTablesBase3, false)
      const ctime2 = ktbs2.scopedColumns.tb_user.ctime
      assert(ctime2 && ctime)
    })

    it('pass false as parameter createColumnNameFn', () => {
      const ktbs = genKTablesFromBase(kTablesBase4, false)
      const ctime = kTablesBase4.columns.tb_user.ctime
      const sctime = ktbs.scopedColumns.tb_user.ctime

      assert(sctime && sctime === ctime)
      assert(sctime === kTablesBase4.columns.tb_user.ctime)
    })
  })

})

