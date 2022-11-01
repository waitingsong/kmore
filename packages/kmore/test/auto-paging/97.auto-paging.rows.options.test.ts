import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { PagingOptions, KmoreFactory, PageArrayType, PagingMeta } from '../../src/index.js'
import { config, dbDict } from '../test.config.js'

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

  describe('Should autoPaging work with options', () => {
    it('pageSize: 1', async () => {
      const options: Partial<PagingOptions> = {
        pageSize: 1,
      }
      const ret = await tables.ref_tb_user(options).autoPaging(options)

      const meta: PagingMeta = {
        pageCountAll: 3,
        pageCurrent: 1,
        pageSize: 1,
      }
      validatePagerRet(ret, meta)
    })

    it('pageSize: 2', async () => {
      const options: Partial<PagingOptions> = {
        pageSize: 2,
      }
      const ret = await tables.ref_tb_user(options).autoPaging(options)

      const meta: PagingMeta = {
        pageCountAll: 3,
        pageCurrent: 1,
        pageSize: 2,
      }
      validatePagerRet(ret, meta)
    })

    it('pageSize: 3', async () => {
      const options: Partial<PagingOptions> = {
        pageSize: 3,
      }
      const ret = await tables.ref_tb_user(options).autoPaging(options)

      const meta: PagingMeta = {
        pageCountAll: 3,
        pageCurrent: 1,
        pageSize: 3,
      }
      validatePagerRet(ret, meta)
    })

    it('page: 2', async () => {
      const options: Partial<PagingOptions> = {
        page: 2,
        pageSize: 2,
      }
      const ret = await tables.ref_tb_user(options).autoPaging(options)

      const meta: PagingMeta = {
        pageCountAll: 3,
        pageCurrent: 2,
        pageSize: 2,
      }
      validatePagerRet(ret, meta)
    })

    it('page: 3', async () => {
      const options: Partial<PagingOptions> = {
        page: 3,
        pageSize: 2,
      }
      const ret = await tables.ref_tb_user(options).autoPaging(options)

      const meta: PagingMeta = {
        pageCountAll: 3,
        pageCurrent: 3,
        pageSize: 2,
      }
      validatePagerRet(ret, meta)
      assert(ret.length === 0)
    })

    it('enable: false', async () => {
      const options: Partial<PagingOptions> = {
        enable: false,
        pageSize: 2,
      }
      const ret = await tables.ref_tb_user(options).autoPaging(options)

      assert(ret.length === 3)
      assert(! Object.hasOwn(ret, 'pageCountAll'))
    })
  })
})


function validatePagerRet(input: PageArrayType<UserDTO>, expect: PagingMeta): void {
  assert(input)
  assert(Array.isArray(input))

  assert(expect)
  Object.keys(expect).forEach((key) => {
    assert(Object.hasOwn(input, key))
  })

  const { pageCountAll, pageCurrent, pageSize } = input
  assert(typeof pageCountAll === 'number')
  assert(typeof pageCurrent === 'number')
  assert(typeof pageSize === 'number')

  assert(pageSize === expect.pageSize)
  assert(pageCountAll === expect.pageCountAll)
  assert(input.length <= expect.pageSize)
}

