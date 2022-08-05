import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory } from '../src/index.js'

import { config } from './test.config.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config })

  before(() => {
    assert(! km.dict, 'km.dict should be undefined')
    assert(km.dbh)
    assert(typeof km.dbh.destroy === 'function')
  })

  after(async () => {
    if (km.dbh && km.dbh.destroy) {
      await km.dbh.destroy() // !
    }
  })

  describe('Should ref-tables empty', () => {
    it('refTables', async () => {
      assert(typeof km.refTables === 'object')
      assert(Object.keys(km.refTables).length === 0)
    })

    it('camelTables', async () => {
      assert(typeof km.camelTables === 'object')
      assert(Object.keys(km.camelTables).length === 0)
    })

    it('snakeTables', async () => {
      assert(typeof km.snakeTables === 'object')
      assert(Object.keys(km.snakeTables).length === 0)
    })
  })

})

