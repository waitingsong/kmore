import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'


import { KmoreFactory, PageRawType } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'
import type { UserDTO } from '#@/test.model.js'

import {
  validatePageRet,
  validatePageRetPartial,
  validateRet,
  validateRowsOrder,
  validateRowsOrderPartial,
} from './util.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })
  const colkeys: (keyof UserDTO)[] = ['uid', 'realName']

  const tables = km.camelTables
  const uid = 1
  const ord = 'desc'

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should autoPaging work with orderBy desc', () => {
    it('normal', async () => {
      const ret0 = await tables.ref_tb_user()
      validateRet(ret0)

      const ret = await tables.ref_tb_user()
        .autoPaging()
      validatePageRet(ret)
    })

    it('all orderby desc', async () => {
      const ret10 = await tables.ref_tb_user()
        .autoPaging()
        .orderBy('uid', ord)
      validatePageRet(ret10)
      validateRowsOrder(ret10, ord)

      const ret11 = await tables.ref_tb_user()
        .autoPaging()
        .orderBy('uid', ord)
        .then()
      validatePageRet(ret11)
      validateRowsOrder(ret11, ord)

      const ret12 = await tables.ref_tb_user()
        .autoPaging()
        .orderBy('uid', ord)
        .then()
        .then(rows => rows)
      validatePageRet(ret12)
      validateRowsOrder(ret12, ord)

      const ret20 = await tables.ref_tb_user()
        .autoPaging()
        .orderBy('uid', ord)
        .select('*')
      validatePageRet(ret20)
      validateRowsOrder(ret20, ord)

      const ret21 = await tables.ref_tb_user()
        .autoPaging()
        .select('*')
        .orderBy('uid', ord)
        .then()
      validatePageRet(ret21)
      validateRowsOrder(ret21, ord)

      const ret22 = await tables.ref_tb_user()
        .select('*')
        .autoPaging()
        .orderBy('uid', ord)
      validatePageRet(ret22)
      validateRowsOrder(ret22, ord)

      const ret23 = await tables.ref_tb_user()
        .select('*')
        .autoPaging()
        .orderBy('uid', ord)
        .then()
      validatePageRet(ret23)
      validateRowsOrder(ret23, ord)
    })

    it('partial', async () => {
      const ret30 = await tables.ref_tb_user()
        .autoPaging()
        .select('uid', 'realName')
        .orderBy('uid', ord)
      validatePageRetPartial(ret30, colkeys)
      validateRowsOrderPartial(ret30, ord)

      const ret31 = await tables.ref_tb_user()
        .autoPaging()
        .select('uid', 'realName')
        .orderBy('uid', ord)
        .then()
      validatePageRetPartial(ret31, colkeys)
      validateRowsOrderPartial(ret31, ord)

      const ret32 = await tables.ref_tb_user()
        .select('uid', 'realName')
        .autoPaging()
        .orderBy('uid', ord)
      validatePageRetPartial(ret32, colkeys)
      validateRowsOrderPartial(ret32, ord)

      const ret33 = await tables.ref_tb_user()
        .select('uid', 'realName')
        .autoPaging()
        .orderBy('uid', ord)
        .then()
      validatePageRetPartial(ret33, colkeys)
      validateRowsOrderPartial(ret33, ord)

      const ret40 = await tables.ref_tb_user()
        .autoPaging()
        .select(colkeys)
        .orderBy('uid', ord)
      validatePageRetPartial(ret40, colkeys)
      validateRowsOrderPartial(ret40, ord)

      const ret41 = await tables.ref_tb_user()
        .autoPaging()
        .select(colkeys)
        .orderBy('uid', ord)
        .then()
      validatePageRetPartial(ret41, colkeys)
      validateRowsOrderPartial(ret41, ord)

      const ret42 = await tables.ref_tb_user()
        .select(colkeys)
        .autoPaging()
        .orderBy('uid', ord)
      validatePageRetPartial(ret42, colkeys)
      validateRowsOrderPartial(ret42, ord)

      const ret43 = await tables.ref_tb_user()
        .select(colkeys)
        .autoPaging()
        .orderBy('uid', ord)
        .then()
      validatePageRetPartial(ret43, colkeys)
      validateRowsOrderPartial(ret43, ord)
    })

    it('where', async () => {
      const ret = await tables.ref_tb_user()
        .autoPaging()
        .where({ uid })

      validatePageRet(ret, 1)
    })

    it('where orderby asc', async () => {
      const ret = await tables.ref_tb_user()
        .autoPaging()
        .where({ uid })
        .orderBy('uid', 'asc')

      validatePageRet(ret, 1)
    })

    it('where orderby desc', async () => {
      const ret = await tables.ref_tb_user()
        .autoPaging()
        .where({ uid })
        .orderBy('uid', 'desc')

      validatePageRet(ret, 1)
    })

  })
})

