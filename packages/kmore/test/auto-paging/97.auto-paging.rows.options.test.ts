import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { type PagingMeta, type PagingOptions, KmoreFactory } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'
import type { UserDTO } from '#@/test.model.js'

import { validateOptionsPageRet } from './output.helper.js'


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

  describe('Should autoPaging work with options', () => {
    it('pageSize: 1', async () => {
      const options: Partial<PagingOptions> = {
        pageSize: 1,
      }
      const ret = await tables.tb_user().autoPaging(options)

      const meta: PagingMeta = {
        total: 3n,
        page: 1,
        pageSize: 1,
      }
      validateOptionsPageRet(ret, meta)
    })

    it('pageSize: 2', async () => {
      const options: Partial<PagingOptions> = {
        pageSize: 2,
      }
      const ret = await tables.tb_user().autoPaging(options)

      const meta: PagingMeta = {
        total: 3n,
        page: 1,
        pageSize: 2,
      }
      validateOptionsPageRet(ret, meta)
    })

    it('pageSize: 3', async () => {
      const options: Partial<PagingOptions> = {
        pageSize: 3,
      }
      const ret = await tables.tb_user().autoPaging(options)

      const meta: PagingMeta = {
        total: 3n,
        page: 1,
        pageSize: 3,
      }
      validateOptionsPageRet(ret, meta)
    })

    it('page: 2', async () => {
      const options: Partial<PagingOptions> = {
        page: 2,
        pageSize: 2,
      }
      const ret = await tables.tb_user().autoPaging(options)

      const meta: PagingMeta = {
        total: 3n,
        page: 2,
        pageSize: 2,
      }
      validateOptionsPageRet(ret, meta)
    })

    it('page: 3', async () => {
      const options: Partial<PagingOptions> = {
        page: 3,
        pageSize: 2,
      }
      const ret = await tables.tb_user().autoPaging(options)

      const meta: PagingMeta = {
        total: 3n,
        page: 3,
        pageSize: 2,
      }
      validateOptionsPageRet(ret, meta)
      assert(ret.length === 0)
    })

    it('enable: false', async () => {
      const options: Partial<PagingOptions> = {
        enable: false,
        pageSize: 2,
      }
      const ret = await tables.tb_user().autoPaging(options)

      assert(ret.length === 3)
      assert(! Object.hasOwn(ret, 'total'))
    })
  })
})

