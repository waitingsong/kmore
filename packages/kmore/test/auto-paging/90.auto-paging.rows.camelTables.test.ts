import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory, PageArrayType } from '../../src/index.js'
import { config, dbDict } from '../test.config.js'

import { validatePagerRet, validatePagerRetPartial, validateRet } from './util.js'

import type { UserDTO } from '@/test.model.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })
  const colkeys: (keyof UserDTO)[] = ['uid', 'realName']

  const tables = km.camelTables
  const uid = 1

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should autoPaging work', () => {
    it('normal', async () => {
      const ret0 = await tables.ref_tb_user()
      validateRet(ret0)

      const ret = await tables.ref_tb_user()
        .autoPaging()
      validatePagerRet(ret)
    })

    it('all', async () => {
      const ret10 = await tables.ref_tb_user()
        .autoPaging()
      validatePagerRet(ret10)

      const ret11 = await tables.ref_tb_user()
        .autoPaging()
        .then()
      validatePagerRet(ret11)

      const ret12 = await tables.ref_tb_user()
        .autoPaging()
        .then()
        .then(rows => rows)
      validatePagerRet(ret12)

      const ret20 = await tables.ref_tb_user()
        .autoPaging()
        .select('*')
      validatePagerRet(ret20)

      const ret21 = await tables.ref_tb_user()
        .autoPaging()
        .select('*')
        .then()
      validatePagerRet(ret21)

      const ret22 = await tables.ref_tb_user()
        .select('*')
        .autoPaging()
      validatePagerRet(ret22)

      const ret23 = await tables.ref_tb_user()
        .select('*')
        .autoPaging()
        .then()
      validatePagerRet(ret23)
    })

    it('partial', async () => {
      const ret30 = await tables.ref_tb_user()
        .autoPaging()
        .select('uid', 'realName')
      validatePagerRetPartial(ret30, colkeys)

      const ret31 = await tables.ref_tb_user()
        .autoPaging()
        .select('uid', 'realName')
        .then()
      validatePagerRetPartial(ret31, colkeys)

      const ret32 = await tables.ref_tb_user()
        .select('uid', 'realName')
        .autoPaging()
      validatePagerRetPartial(ret32, colkeys)

      const ret33 = await tables.ref_tb_user()
        .select('uid', 'realName')
        .autoPaging()
        .then()
      validatePagerRetPartial(ret33, colkeys)

      const ret40 = await tables.ref_tb_user()
        .autoPaging()
        .select(colkeys)
      validatePagerRetPartial(ret40, colkeys)

      const ret41 = await tables.ref_tb_user()
        .autoPaging()
        .select(colkeys)
        .then()
      validatePagerRetPartial(ret41, colkeys)

      const ret42 = await tables.ref_tb_user()
        .select(colkeys)
        .autoPaging()
      validatePagerRetPartial(ret42, colkeys)

      const ret43 = await tables.ref_tb_user()
        .select(colkeys)
        .autoPaging()
        .then()
      validatePagerRetPartial(ret43, colkeys)
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

    it('ignore limit()', async () => {
      const ret: PageArrayType<UserDTO> = await tables.ref_tb_user()
        .select('*')
        .limit(1) // will be ignored
        // @ts-ignore
        .autoPaging()

      validatePagerRet(ret, 3)
    })

    it('smartJoin', async () => {
      const ret = await tables.ref_tb_user()
        .autoPaging()
        .smartJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .where('tbUserExtUid', uid)

      console.log({ ret })
      assert(ret)
    })

  })
})

