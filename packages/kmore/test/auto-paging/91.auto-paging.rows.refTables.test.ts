/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory, type PageRawType } from '##/index.js'
import { initPagingMeta } from '##/lib/proxy.auto-paging.js'
import { config, dbDict } from '#@/test.config.js'
import type { UserDo, UserDTO } from '#@/test.model.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })
  const colkeys: (keyof UserDo)[] = ['uid', 'real_name']

  const tables = km.refTables
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

      // const ret20 = await tables.ref_tb_user()
      //   .autoPaging()
      //   .select('*')
      // validatePagerRet(ret20)

      // const ret21 = await tables.ref_tb_user()
      //   .autoPaging()
      //   .select('*')
      //   .then()
      // validatePagerRet(ret21)

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
      // const ret30 = await tables.ref_tb_user()
      //   .autoPaging()
      //   .select('uid', 'realName')
      // validatePagerRetPartial(ret30, colkeys)

      // const ret31 = await tables.ref_tb_user()
      //   .autoPaging()
      //   .select('uid', 'realName')
      //   .then()
      // validatePagerRetPartial(ret31, colkeys)

      const ret32 = await tables.ref_tb_user()
        .select('uid', 'realName')
        .autoPaging()
      validatePagerRetPartial(ret32, colkeys)

      const ret33 = await tables.ref_tb_user()
        .select('uid', 'realName')
        .autoPaging()
        .then()
      validatePagerRetPartial(ret33, colkeys)

      // const ret40 = await tables.ref_tb_user()
      //   .autoPaging()
      //   .select(colkeys)
      // validatePagerRetPartial(ret40, colkeys)

      // const ret41 = await tables.ref_tb_user()
      //   .autoPaging()
      //   .select(colkeys)
      //   .then()
      // validatePagerRetPartial(ret41, colkeys)

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
        .where({ uid })
        .autoPaging()
      validatePagerRet(ret, 1)
    })

    it('where orderby asc', async () => {
      const ret = await tables.ref_tb_user()
        .where({ uid })
        .orderBy('uid', 'asc')
        .autoPaging()
      validatePagerRet(ret, 1)
    })

    it('where orderby desc', async () => {
      const ret = await tables.ref_tb_user()
        .where({ uid })
        .orderBy('uid', 'desc')
        .autoPaging()
      validatePagerRet(ret, 1)
    })

    it('ignore limit()', async () => {
      const ret: PageRawType<UserDo> = await tables.ref_tb_user()
        .select('*')
        .limit(1) // will be ignored
        .autoPaging()

      validatePagerRet(ret, 3)
    })

    // it.skip('smartJoin', async () => {
    //   const ret = await tables.ref_tb_user()
    //     .autoPaging()
    //     .smartJoin(
    //       'tb_user_ext.uid',
    //       'tb_user.uid',
    //     )
    //     .where('tb_user_ext_uid', uid)

    //   console.log({ ret })
    //   assert(ret)
    // })

  })
})



function validatePagerRet(input: PageRawType<UserDo>, len = 3): void {
  assert(input)

  assert(Object.hasOwn(input, 'total'))
  assert(Object.hasOwn(input, 'page'))
  assert(Object.hasOwn(input, 'pageSize'))

  const { total, page, pageSize } = input
  // console.log({ total, page, pageSize, rows: input.length })
  assert(typeof total === 'bigint')
  assert(typeof page === 'number')
  assert(typeof pageSize === 'number')

  assert(pageSize === initPagingMeta.pageSize)
  assert(pageSize > 0, JSON.stringify(input))
  assert(total > 0, JSON.stringify(input))
  assert(Array.isArray(input), JSON.stringify(input))
  assert(input.length === len, JSON.stringify(input))
  assert(pageSize >= input.length, JSON.stringify(input))

  const [row] = input
  // console.log({ row })
  assert(row, JSON.stringify(input))
  assert(row.uid, JSON.stringify(input))
  assert(row.name, JSON.stringify(input))
}

function validatePagerRetPartial(
  input: PageRawType<Partial<UserDTO>>,
  keys: string[],
  len = 3,
): void {

  assert(input)
  assert(keys)
  assert(keys.length > 0)

  const inputKeys = Object.keys(input)
  /**
   * keyof PagingMeta is not enumerable
   */
  Object.keys(initPagingMeta).forEach((key) => {
    assert(! inputKeys.includes(key))
  })

  const { total, page, pageSize } = input
  // console.log({ total, page, pageSize, rows: input.length })
  assert(typeof total === 'bigint', JSON.stringify(input))
  assert(typeof page === 'number', JSON.stringify(input))
  assert(typeof pageSize === 'number', JSON.stringify(input))

  assert(pageSize === initPagingMeta.pageSize, JSON.stringify(input))
  assert(pageSize > 0, JSON.stringify(input))
  assert(total > 0, JSON.stringify(input))
  assert(Array.isArray(input), JSON.stringify(input))
  assert(input.length === len, JSON.stringify(input))
  assert(pageSize >= input.length, JSON.stringify(input))

  const [row] = input
  assert(row)
  const rowKeys = Object.keys(row)
  assert(
    rowKeys.length === keys.length,
    `rowKeys: ${JSON.stringify(rowKeys)}, keys: ${JSON.stringify(keys)}`,
  )
  keys.forEach((key) => {
    assert(rowKeys.includes(key))
  })
}

function validateRet(input: UserDo[], len = 3): void {
  assert(input)

  const keys = Object.keys(input)
  /**
   * keyof PagingMeta is not enumerable
   */
  Object.keys(initPagingMeta).forEach((key) => {
    assert(! keys.includes(key))
  })

  assert(Array.isArray(input))
  assert(input.length === len)

  const [row] = input
  // console.log({ row })
  assert(row)
  assert(row.uid)
  assert(row.name)
}
