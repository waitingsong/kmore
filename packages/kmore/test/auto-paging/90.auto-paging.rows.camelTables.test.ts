/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'
import { RecordCamelKeys } from '@waiting/shared-types'

import { KmoreFactory, type PageRawType } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'
import type { UserDTO } from '#@/test.model.js'

import { validatePageRet, validatePageRetPartial, validateRet } from './util.js'


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
      const ret0 = await tables.tb_user()
      validateRet(ret0)

      const ret: PageRawType<UserDTO> = await tables.tb_user()
        .autoPaging()
      validatePageRet(ret)
    })
    it('error with .first()', async () => {
      try {
        await tables.tb_user()
          .select('uid')
          .autoPaging()
          .first()
      }
      catch (ex) {
        assert(ex instanceof Error)
        assert(ex.message.includes('first() is not supported with autoPaging()'), ex.message)
        return
      }
      assert(false, 'Should throw Error')
    })

    it('all', async () => {
      const ret10 = await tables.tb_user()
        .autoPaging()
      validatePageRet(ret10)

      const ret11 = await tables.tb_user()
        .autoPaging()
        .then()
      validatePageRet(ret11)

      const ret12 = await tables.tb_user()
        .select('*')
        .autoPaging()
        .then()
        .then(rows => rows)
      validatePageRet(ret12)

      // const ret20 = await tables.tb_user()
      //   .autoPaging()
      //   .select('*')
      // validatePageRet(ret20)

      // const ret21 = await tables.tb_user()
      //   .autoPaging()
      //   .select('*')
      //   .then()
      // validatePageRet(ret21)

      const ret22 = await tables.tb_user()
        .select('*')
        .autoPaging()
      validatePageRet(ret22)

      const ret23 = await tables.tb_user()
        .select('*')
        .autoPaging()
        .then()
      validatePageRet(ret23)
    })

    it('partial', async () => {
      // const ret30 = await tables.tb_user()
      //   .autoPaging()
      //   .select('uid', 'realName')
      // validatePageRetPartial(ret30, colkeys)

      // const ret31 = await tables.tb_user()
      //   .autoPaging()
      //   .select('uid', 'realName')
      //   .then()
      // validatePageRetPartial(ret31, colkeys)

      const ret32 = await tables.tb_user()
        .select('uid', 'realName')
        .autoPaging()
      validatePageRetPartial(ret32, colkeys)

      const ret33 = await tables.tb_user()
        .select('uid', 'realName')
        .autoPaging()
        .then()
      validatePageRetPartial(ret33, colkeys)

      // const ret40 = await tables.tb_user()
      //   .autoPaging()
      //   .select(colkeys)
      // validatePageRetPartial(ret40, colkeys)

      // const ret41 = await tables.tb_user()
      //   .autoPaging()
      //   .select(colkeys)
      //   .then()
      // validatePageRetPartial(ret41, colkeys)

      const ret42 = await tables.tb_user()
        .select(colkeys)
        .autoPaging()
      validatePageRetPartial(ret42, colkeys)

      const ret43 = await tables.tb_user()
        .select(colkeys)
        .autoPaging()
        .then()
      validatePageRetPartial(ret43, colkeys)
    })

    it('where', async () => {
      const ret = await tables.tb_user()
        .where({ uid })
        .autoPaging()
      validatePageRet(ret, 1)
    })

    it('where orderby asc', async () => {
      const ret = await tables.tb_user()
        .where({ uid })
        .orderBy('uid', 'asc')
        .autoPaging()
      validatePageRet(ret, 1)
    })

    it('where orderby desc', async () => {
      const ret = await tables.tb_user()
        .where({ uid })
        .orderBy('uid', 'desc')
        .autoPaging()
      validatePageRet(ret, 1)
    })

    it('ignore limit()', async () => {
      const ret: PageRawType<UserDTO> = await tables.tb_user()
        .select('*')
        .limit(1) // will be ignored
        .autoPaging()

      validatePageRet(ret, 3)
    })

    it('smartJoin', async () => {
      const ret = await tables.tb_user()
        .smartJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .where('tbUserExtUid', uid)
        .autoPaging()

      console.log({ ret })
      assert(ret)
    })

  })
})

