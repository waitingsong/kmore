import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { type PagingMeta, type PagingOptions, KmoreFactory } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'
import type { UserDTO } from '#@/test.model.js'

import { validateOptionsPageRet, validateOptionsPageWrapRet } from './output.helper.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })
  const colkeys: (keyof UserDTO)[] = ['uid', 'realName']

  const tables = km.camelTables
  const uid = 1
  const ord = 'asc'

  const meta: PagingMeta = {
    total: 3n,
    page: 1,
    pageSize: 1,
  }

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should autoPaging work with wrapOutput param', () => {
    it('true', async () => {
      const options: PagingOptions = {
        enable: true,
        page: 1,
        pageSize: 1,
      }
      const ret = await tables.tb_user().autoPaging(options, true)
      validateOptionsPageWrapRet(ret, meta)
    })

    it('false', async () => {
      const options: PagingOptions = {
        enable: true,
        page: 1,
        pageSize: 1,
      }
      const ret = await tables.tb_user().autoPaging(options, false)
      validateOptionsPageRet(ret, meta)
    })

    it('undefined', async () => {
      const options: PagingOptions = {
        enable: true,
        page: 1,
        pageSize: 1,
      }
      const ret = await tables.tb_user().autoPaging(options, void 0)
      validateOptionsPageRet(ret, meta)
    })

    it('not passing param', async () => {
      const options: PagingOptions = {
        enable: true,
        page: 1,
        pageSize: 1,
      }
      const ret = await tables.tb_user().autoPaging(options)
      validateOptionsPageRet(ret, meta)
    })
  })
})
