import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory } from '../../src/index.js'
import { config, dbDict } from '../test.config.js'

import {
  validatePagerRet,
  validatePagerRetPartial,
  validateRet,
  validateRowsOrder,
  validateRowsOrderPartical,
} from './util.js'

import type { UserDTO } from '@/test.model.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })
  const colkeys: (keyof UserDTO)[] = ['uid', 'realName']

  const tables = km.camelTables
  const uid = 1
  const ord = 'asc'

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
      validatePagerRet(ret)
    })

    it('all orderby desc', async () => {
      const ret10 = await tables.ref_tb_user()
        .autoPaging()
        .orderBy('uid', ord)
      validatePagerRet(ret10)
      validateRowsOrder(ret10, ord)

      const ret11 = await tables.ref_tb_user()
        .autoPaging()
        .orderBy('uid', ord)
        .then()
      validatePagerRet(ret11)
      validateRowsOrder(ret11, ord)

      const ret12 = await tables.ref_tb_user()
        .autoPaging()
        .orderBy('uid', ord)
        .then()
        .then(rows => rows)
      validatePagerRet(ret12)
      validateRowsOrder(ret12, ord)

      const ret20 = await tables.ref_tb_user()
        .autoPaging()
        .orderBy('uid', ord)
        .select('*')
      validatePagerRet(ret20)
      validateRowsOrder(ret20, ord)

      const ret21 = await tables.ref_tb_user()
        .autoPaging()
        .select('*')
        .orderBy('uid', ord)
        .then()
      validatePagerRet(ret21)
      validateRowsOrder(ret21, ord)

      const ret22 = await tables.ref_tb_user()
        .select('*')
        .autoPaging()
        .orderBy('uid', ord)
      validatePagerRet(ret22)
      validateRowsOrder(ret22, ord)

      const ret23 = await tables.ref_tb_user()
        .select('*')
        .autoPaging()
        .orderBy('uid', ord)
        .then()
      validatePagerRet(ret23)
      validateRowsOrder(ret23, ord)
    })

    it('partial', async () => {
      const ret30 = await tables.ref_tb_user()
        .autoPaging()
        .select('uid', 'realName')
        .orderBy('uid', ord)
      validatePagerRetPartial(ret30, colkeys)
      validateRowsOrderPartical(ret30, ord)

      const ret31 = await tables.ref_tb_user()
        .autoPaging()
        .select('uid', 'realName')
        .orderBy('uid', ord)
        .then()
      validatePagerRetPartial(ret31, colkeys)
      validateRowsOrderPartical(ret31, ord)

      const ret32 = await tables.ref_tb_user()
        .select('uid', 'realName')
        .autoPaging()
        .orderBy('uid', ord)
      validatePagerRetPartial(ret32, colkeys)
      validateRowsOrderPartical(ret32, ord)

      const ret33 = await tables.ref_tb_user()
        .select('uid', 'realName')
        .autoPaging()
        .orderBy('uid', ord)
        .then()
      validatePagerRetPartial(ret33, colkeys)
      validateRowsOrderPartical(ret33, ord)

      const ret40 = await tables.ref_tb_user()
        .autoPaging()
        .select(colkeys)
        .orderBy('uid', ord)
      validatePagerRetPartial(ret40, colkeys)
      validateRowsOrderPartical(ret40, ord)

      const ret41 = await tables.ref_tb_user()
        .autoPaging()
        .select(colkeys)
        .orderBy('uid', ord)
        .then()
      validatePagerRetPartial(ret41, colkeys)
      validateRowsOrderPartical(ret41, ord)

      const ret42 = await tables.ref_tb_user()
        .select(colkeys)
        .autoPaging()
        .orderBy('uid', ord)
      validatePagerRetPartial(ret42, colkeys)
      validateRowsOrderPartical(ret42, ord)

      const ret43 = await tables.ref_tb_user()
        .select(colkeys)
        .autoPaging()
        .orderBy('uid', ord)
        .then()
      validatePagerRetPartial(ret43, colkeys)
      validateRowsOrderPartical(ret43, ord)
    })

    it('where', async () => {
      const ret = await tables.ref_tb_user()
        .autoPaging()
        .where({ uid })

      validatePagerRet(ret, 1)
    })

    it('where orderby asc', async () => {
      const ret = await tables.ref_tb_user()
        .autoPaging()
        .where({ uid })
        .orderBy('uid', 'asc')

      validatePagerRet(ret, 1)
    })

    it('where orderby desc', async () => {
      const ret = await tables.ref_tb_user()
        .autoPaging()
        .where({ uid })
        .orderBy('uid', 'desc')

      validatePagerRet(ret, 1)
    })

  })
})

